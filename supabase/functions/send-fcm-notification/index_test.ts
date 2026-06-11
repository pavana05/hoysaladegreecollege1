import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Generate a real RSA keypair so getAccessToken()'s SubtleCrypto.importKey
// succeeds. The key never leaves this test — Google OAuth is mocked.
async function generatePemPrivateKey(): Promise<string> {
  const { privateKey } = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const lines = b64.match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
}

const FAKE_SA = {
  client_email: "test@example.iam.gserviceaccount.com",
  private_key: await generatePemPrivateKey(),
  token_uri: "https://oauth2.googleapis.test/token",
  project_id: "hdc-test",
};
Deno.env.set("SUPABASE_URL", "https://example.supabase.test");
Deno.env.set("SUPABASE_ANON_KEY", "anon-key");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-key");
Deno.env.set("FIREBASE_SERVICE_ACCOUNT_JSON", JSON.stringify(FAKE_SA));

const { handler } = await import("./index.ts");

type Captured = { url: string; init: RequestInit | undefined };

function installFetchMock(captured: Captured[]) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (
    input: Request | string | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    captured.push({ url, init });

    // Google OAuth token endpoint
    if (url.includes("oauth2.googleapis")) {
      return new Response(
        JSON.stringify({ access_token: "test-access-token" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Supabase auth: getUser() returns the authenticated caller
    if (url.includes("/auth/v1/user")) {
      return new Response(
        JSON.stringify({ id: "admin-user-id", email: "admin@test" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Supabase REST: user_roles lookup for caller role check
    if (url.includes("/rest/v1/user_roles") && url.includes("admin-user-id")) {
      return new Response(
        JSON.stringify([{ role: "admin" }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Supabase REST: user_roles broadcast lookup (target_role -> user ids)
    if (url.includes("/rest/v1/user_roles")) {
      return new Response(
        JSON.stringify([{ user_id: "student-1" }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Supabase REST: fcm_tokens for target users
    if (url.includes("/rest/v1/fcm_tokens")) {
      return new Response(
        JSON.stringify([
          { id: "tok-1", user_id: "student-1", token: "device-token-abc" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // FCM send endpoint — answer OK so the handler counts a success.
    if (url.includes("fcm.googleapis.com")) {
      return new Response(JSON.stringify({ name: "ok" }), { status: 200 });
    }

    return new Response("not mocked: " + url, { status: 599 });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function pickFcmSend(captured: Captured[]) {
  return captured.find((c) => c.url.includes("fcm.googleapis.com"));
}

Deno.test("rejects unauthenticated requests", async () => {
  const captured: Captured[] = [];
  const restore = installFetchMock(captured);
  try {
    const res = await handler(
      new Request("https://fn.test/send-fcm-notification", { method: "POST" }),
    );
    assertEquals(res.status, 401);
    await res.text();
  } finally {
    restore();
  }
});

Deno.test(
  "broadcast forwards urgency + kind into the FCM data payload",
  async () => {
    const captured: Captured[] = [];
    const restore = installFetchMock(captured);
    try {
      const res = await handler(
        new Request("https://fn.test/send-fcm-notification", {
          method: "POST",
          headers: {
            "Authorization": "Bearer fake-jwt",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_role: ["student"],
            data: {
              urgency: "urgent",
              kind: "app_update",
              version: "2.4.0",
            },
            notifications: [{
              title: "🚀 HDC Portal v2.4.0 is here",
              body: "Tap to install the latest update.",
              url: "/dashboard",
            }],
          }),
        }),
      );

      const text = await res.text();
      assertEquals(res.status, 200, "handler should respond 200, got " + text);

      const fcmCall = pickFcmSend(captured);
      assert(fcmCall, "expected an FCM send call");
      const body = JSON.parse(String(fcmCall!.init!.body));
      const data = body.message.data;

      // Critical assertions: data tags survive into the outgoing FCM message
      // so the client can drive focus-mode filtering and tap routing.
      assertEquals(data.urgency, "urgent");
      assertEquals(data.kind, "app_update");
      assertEquals(data.version, "2.4.0");
      assertEquals(data.url, "/dashboard");
      assertEquals(data.click_action, "OPEN_ACTIVITY");

      // FCM data values must all be strings — regression guard for the
      // Object.fromEntries(... String(v)) transform.
      for (const [k, v] of Object.entries(data)) {
        assertEquals(typeof v, "string", `data.${k} must be string`);
      }

      // High-priority Android delivery so backgrounded devices wake up.
      assertEquals(body.message.android.priority, "high");
      assertEquals(body.message.notification.title, "🚀 HDC Portal v2.4.0 is here");
    } finally {
      restore();
    }
  },
);

Deno.test("omits extra data when caller passes none", async () => {
  const captured: Captured[] = [];
  const restore = installFetchMock(captured);
  try {
    const res = await handler(
      new Request("https://fn.test/send-fcm-notification", {
        method: "POST",
        headers: {
          "Authorization": "Bearer fake-jwt",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_role: ["student"],
          notifications: [{ title: "Hi", body: "Test", url: "/x" }],
        }),
      }),
    );
    await res.text();
    const fcmCall = pickFcmSend(captured);
    assert(fcmCall);
    const data = JSON.parse(String(fcmCall!.init!.body)).message.data;
    assertEquals(data.urgency, undefined);
    assertEquals(data.kind, undefined);
    assertEquals(data.url, "/x");
  } finally {
    restore();
  }
});
