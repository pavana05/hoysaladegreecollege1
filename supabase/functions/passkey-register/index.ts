import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type UserContext = {
  userId: string;
  email: string;
  displayName: string;
};

function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  let binary = "";
  array.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function toBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getRpId(req: Request, supabaseUrl: string): string {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      // ignore
    }
  }
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return "localhost";
  }
}

async function resolveUserContext(token: string, supabaseAdmin: any): Promise<UserContext | null> {
  // SECURITY: Only trust cryptographically verified JWTs. No fallback to
  // unsigned decoding — that would allow attackers to forge a `sub` claim
  // and register a passkey for any victim account.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    console.error("passkey-register: auth.getUser failed", error);
    return null;
  }
  const user = data.user;
  return {
    userId: user.id,
    email: user.email || user.id,
    displayName: user.user_metadata?.full_name || user.email || "User",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const userContext = await resolveUserContext(token, supabaseAdmin);
    if (!userContext) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return await handleRequest(req, userContext, supabaseUrl, supabaseAdmin);
  } catch (err) {
    console.error("passkey-register error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleRequest(req: Request, user: UserContext, supabaseUrl: string, supabaseAdmin: any) {
  const { action, credential } = await req.json();
  const rpId = getRpId(req, supabaseUrl);

  if (action === "get-options") {
    const challenge = generateChallenge();
    const { data: existing } = await supabaseAdmin.from("passkeys").select("credential_id").eq("user_id", user.userId);

    const options = {
      challenge,
      rp: { name: "Hoysala Degree College", id: rpId },
      user: {
        id: toBase64Url(user.userId),
        name: user.email,
        displayName: user.displayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
        residentKey: "preferred",
      },
      timeout: 60000,
      excludeCredentials: (existing || []).map((e: any) => ({ id: e.credential_id, type: "public-key" })),
    };

    return new Response(JSON.stringify({ options, challenge }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "register") {
    const { id, rawId, response: credResponse, name } = credential || {};
    if (!id && !rawId) {
      return new Response(JSON.stringify({ error: "Invalid credential id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabaseAdmin.from("passkeys").insert({
      user_id: user.userId,
      credential_id: rawId || id,
      public_key: credResponse?.publicKey || credResponse?.attestationObject || "",
      counter: 0,
      transports: credential?.transports || [],
      name: name || "My Passkey",
    });

    if (insertError) {
      console.error("passkey-register insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
