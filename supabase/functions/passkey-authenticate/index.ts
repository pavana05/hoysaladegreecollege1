import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function getRpId(req: Request, supabaseUrl: string): string {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {}
  }
  try { return new URL(supabaseUrl).hostname; } catch { return "localhost"; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, credentialId, email, clientDataJSON, authenticatorData, signature } = body;
    const rpId = getRpId(req, supabaseUrl);

    if (action === "get-options") {
      const challenge = generateChallenge();
      const challengeExpiry = new Date(Date.now() + 120000).toISOString();

      let allowCredentials: any[] = [];
      if (email) {
        // Look up user by email in profiles table instead of listing all users
        const { data: profileData } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .ilike("email", email)
          .limit(1)
          .maybeSingle();

        if (profileData?.user_id) {
          const { data: passkeys } = await supabaseAdmin
            .from("passkeys")
            .select("credential_id, transports")
            .eq("user_id", profileData.user_id);
          allowCredentials = (passkeys || []).map((p: any) => ({
            id: p.credential_id,
            type: "public-key",
            transports: p.transports || [],
          }));
        }
      }

      return new Response(JSON.stringify({
        challenge,
        challengeExpiry,
        rpId,
        allowCredentials,
        userVerification: "preferred",
        timeout: 60000,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "authenticate") {
      if (!credentialId) {
        return new Response(JSON.stringify({ error: "Missing credentialId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!clientDataJSON || !authenticatorData || !signature) {
        return new Response(JSON.stringify({ 
          error: "Missing WebAuthn assertion data. Please provide clientDataJSON, authenticatorData, and signature." 
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: passkey, error: passKeyError } = await supabaseAdmin.from("passkeys")
        .select("*")
        .eq("credential_id", credentialId)
        .maybeSingle();

      if (passKeyError || !passkey) {
        console.error("Passkey lookup error:", passKeyError);
        return new Response(JSON.stringify({ error: "Passkey not found. Please register a passkey first." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Verify clientDataJSON
      try {
        const clientDataRaw = atob(clientDataJSON.replace(/-/g, "+").replace(/_/g, "/"));
        const clientData = JSON.parse(clientDataRaw);
        
        if (clientData.type !== "webauthn.get") {
          return new Response(JSON.stringify({ error: "Invalid clientData type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const clientOrigin = clientData.origin;
        if (clientOrigin) {
          try {
            const originHostname = new URL(clientOrigin).hostname;
            if (originHostname !== rpId) {
              return new Response(JSON.stringify({ error: "Origin mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
          } catch {
            return new Response(JSON.stringify({ error: "Invalid origin in clientData" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to parse clientDataJSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Verify authenticatorData flags
      try {
        const authDataBytes = Uint8Array.from(atob(authenticatorData.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
        if (authDataBytes.length < 37) {
          return new Response(JSON.stringify({ error: "Invalid authenticatorData length" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const flags = authDataBytes[32];
        const userPresent = (flags & 0x01) !== 0;
        if (!userPresent) {
          return new Response(JSON.stringify({ error: "User presence flag not set" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const counterBytes = authDataBytes.slice(33, 37);
        const newCounter = (counterBytes[0] << 24) | (counterBytes[1] << 16) | (counterBytes[2] << 8) | counterBytes[3];
        if (newCounter > 0 && passkey.counter > 0 && newCounter <= passkey.counter) {
          return new Response(JSON.stringify({ error: "Authenticator counter check failed - possible cloned authenticator" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await supabaseAdmin.from("passkeys").update({ counter: newCounter > 0 ? newCounter : (passkey.counter || 0) + 1 }).eq("id", passkey.id);
      } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to verify authenticatorData" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!signature || signature.length < 10) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Look up user email from profiles table first, fallback to auth admin
      let userEmail: string | null = null;
      
      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", passkey.user_id)
        .maybeSingle();
      
      if (profileData?.email) {
        userEmail = profileData.email;
      } else {
        // Fallback to auth admin API
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(passkey.user_id);
          if (!userError && userData?.user?.email) {
            userEmail = userData.user.email;
          }
        } catch (e) {
          console.error("Auth getUserById fallback error:", e);
        }
      }

      if (!userEmail) {
        console.error("User not found for passkey user_id:", passkey.user_id);
        return new Response(JSON.stringify({ error: "User account not found. The passkey may be linked to a deleted account." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
      });

      if (linkError) {
        console.error("Magic link error:", linkError);
        return new Response(JSON.stringify({ error: "Authentication failed. Please try again." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        success: true,
        token_hash: linkData?.properties?.hashed_token,
        token: linkData?.properties?.hashed_token,
        email: userEmail,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("passkey-authenticate error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
