import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  }));

  const textEncoder = new TextEncoder();
  const inputData = textEncoder.encode(`${header}.${payload}`);

  // Import private key
  const pemContent = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, inputData);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  const jwt = `${header}.${payload}.${signatureB64}`;

  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (!roleData || !['admin', 'principal', 'teacher'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: 'Firebase service account not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    const { notifications, target_role, data: extraData } = await req.json();

    let userIds: string[] = [];

    if (target_role) {
      // Broadcast mode: send to all users of a role
      const roles = Array.isArray(target_role) ? target_role : [target_role];
      const { data: roleUsers } = await adminClient
        .from('user_roles')
        .select('user_id')
        .in('role', roles);
      userIds = (roleUsers || []).map((r: any) => r.user_id);
    } else if (notifications && Array.isArray(notifications)) {
      userIds = [...new Set(notifications.map((n: any) => n.user_id))];
    }

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No target users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get FCM tokens for these users
    const { data: tokens } = await adminClient
      .from('fcm_tokens')
      .select('*')
      .in('user_id', userIds);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No FCM tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build notification content
    let title = 'HDC Portal';
    let body = 'You have a new notification';
    let link = '/dashboard/student';

    if (notifications && notifications.length > 0) {
      title = notifications[0].title || title;
      body = notifications[0].body || notifications[0].message || body;
      link = notifications[0].url || notifications[0].link || link;
    }

    // Check for broadcast body from request
    const reqBody = notifications ? null : await Promise.resolve();
    
    let sentCount = 0;
    let failedCount = 0;
    const staleTokenIds: string[] = [];

    for (const tokenRecord of tokens) {
      // Per-student custom message if available
      let msgTitle = title;
      let msgBody = body;
      if (notifications) {
        const match = notifications.find((n: any) => n.user_id === tokenRecord.user_id);
        if (match) {
          msgTitle = match.title || title;
          msgBody = match.body || match.message || body;
        }
      }

      try {
        const fcmRes = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: tokenRecord.token,
                notification: {
                  title: msgTitle,
                  body: msgBody,
                },
                // Stringify all extra-data values — FCM data payloads must be
                // string -> string. Carries `urgency` (used by focus-mode) and
                // any `kind`/version tags the caller wants the client to read.
                data: Object.fromEntries(
                  Object.entries({
                    url: link,
                    click_action: 'OPEN_ACTIVITY',
                    ...(extraData || {}),
                  }).map(([k, v]) => [k, String(v)])
                ),
                android: {
                  priority: 'high',
                  notification: {
                    channel_id: 'hdc_notifications',
                    sound: 'default',
                    click_action: 'OPEN_ACTIVITY',
                  },
                },
              },
            }),
          }
        );

        if (fcmRes.ok) {
          sentCount++;
        } else {
          const errData = await fcmRes.json();
          console.error('FCM send error:', JSON.stringify(errData));
          failedCount++;
          // Remove stale tokens
          if (errData?.error?.code === 404 || errData?.error?.code === 410 ||
              errData?.error?.details?.some?.((d: any) => d.errorCode === 'UNREGISTERED')) {
            staleTokenIds.push(tokenRecord.id);
          }
        }
      } catch (err) {
        console.error('FCM fetch error:', err);
        failedCount++;
      }
    }

    // Clean up stale tokens
    if (staleTokenIds.length > 0) {
      await adminClient.from('fcm_tokens').delete().in('id', staleTokenIds);
    }

    return new Response(
      JSON.stringify({ sent: sentCount, failed: failedCount, total_tokens: tokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('FCM notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
