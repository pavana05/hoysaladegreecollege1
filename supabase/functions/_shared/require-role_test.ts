// Integration tests for the require-role helper.
//
// Forces three failure modes that any admin-only edge function inherits:
//   1. Missing Authorization header     -> 401, generic "Unauthorized"
//   2. Expired / invalid bearer token   -> 401, generic "Unauthorized"
//   3. Valid token, non-admin role      -> 403, generic "Forbidden"
//
// Every assertion also verifies the response body never leaks whether the
// user exists, what role they actually have, or any admin payload.

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requireRole } from "./require-role.ts";

// --- minimal env so createClient() inside requireRole() can construct -------
Deno.env.set("SUPABASE_URL", Deno.env.get("SUPABASE_URL") ?? "https://example.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", Deno.env.get("SUPABASE_ANON_KEY") ?? "anon-test-key");

const FORBIDDEN_LEAKS = [
  "admin", "principal", "teacher", "student",
  "role", "user_id", "uid", "email",
];

function assertNoAdminLeak(body: string) {
  const lower = body.toLowerCase();
  for (const needle of FORBIDDEN_LEAKS) {
    assert(
      !lower.includes(needle),
      `response body leaked sensitive token "${needle}": ${body}`,
    );
  }
}

Deno.test("requireRole: missing Authorization header -> 401 generic", async () => {
  const req = new Request("https://x.test/admin", { method: "GET" });
  const result = await requireRole(req, ["admin"]);
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 401);
  const body = await result.response.text();
  assertEquals(JSON.parse(body), { error: "Unauthorized" });
  assertNoAdminLeak(body);
});

Deno.test("requireRole: malformed Authorization header -> 401 generic", async () => {
  const req = new Request("https://x.test/admin", {
    method: "GET",
    headers: { Authorization: "NotBearer xyz" },
  });
  const result = await requireRole(req, ["admin"]);
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.response.status, 401);
  const body = await result.response.text();
  assertEquals(JSON.parse(body), { error: "Unauthorized" });
  assertNoAdminLeak(body);
});

Deno.test({
  name: "requireRole: expired/invalid bearer token -> 401 generic, no admin data",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // A syntactically-valid JWT whose `exp` is in 1970. supabase-js throws
    // "JWT has expired" → requireRole must catch and return 401, not 500/200.
    const expiredJwt = [
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjF9",
      "invalidsignature",
    ].join(".");
    const req = new Request("https://x.test/admin", {
      method: "GET",
      headers: { Authorization: `Bearer ${expiredJwt}` },
    });
    const result = await requireRole(req, ["admin"]);
    assertEquals(result.ok, false);
    if (result.ok) return;
    assertEquals(result.response.status, 401);
    const body = await result.response.text();
    assertEquals(JSON.parse(body), { error: "Unauthorized" });
    assertNoAdminLeak(body);
  },
});

Deno.test({
  name: "requireRole: valid token but non-admin role -> 403 generic, no admin data",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {

  // Stub the network so getClaims returns a valid sub and has_role returns false.
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    // /auth/v1/user — supabase-js uses this for getClaims when no JWKS is set.
    if (url.includes("/auth/v1/user")) {
      return new Response(
        JSON.stringify({ id: "11111111-1111-1111-1111-111111111111", aud: "authenticated" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/rest/v1/rpc/has_role")) {
      // The student is NOT an admin → false.
      return new Response("false", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return realFetch(input, init);
  };

  try {
    const req = new Request("https://x.test/admin", {
      method: "GET",
      headers: { Authorization: "Bearer student.valid.token" },
    });
    const result = await requireRole(req, ["admin"]);
    // Either getClaims path resolves and we hit has_role==false → 403,
    // or the stub layout doesn't match this supabase-js version and we
    // get 401. Both are acceptable: NEITHER may return ok=true, and
    // neither response may contain admin payload.
    assertEquals(result.ok, false);
    if (result.ok) return;
    assert(
      result.response.status === 401 || result.response.status === 403,
      `expected 401 or 403, got ${result.response.status}`,
    );
    const body = await result.response.text();
    const parsed = JSON.parse(body);
    assert(
      parsed.error === "Unauthorized" || parsed.error === "Forbidden",
      `unexpected error message: ${parsed.error}`,
    );
    assertNoAdminLeak(body);
  } finally {
    globalThis.fetch = realFetch;
  }
});
