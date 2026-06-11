// Shared role-verification helper for Supabase Edge Functions.
//
// Why this exists:
//   The frontend route guards (ProtectedRoute, ProtectedRoute role binding)
//   only protect the UI. Any privileged operation an edge function performs
//   MUST independently verify the caller's identity and role on the server
//   using the verified JWT claims, not anything the client sent in the body.
//
// How to use it from any edge function:
//
//   import { requireRole } from "../_shared/require-role.ts";
//
//   const auth = await requireRole(req, ["admin"]);
//   if (!auth.ok) return auth.response;          // 401 or 403, CORS-safe
//   const { userId, role, client } = auth;       // proceed as that user

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export type AppRole = "student" | "teacher" | "principal" | "admin";

export type RequireRoleResult =
  | {
      ok: true;
      userId: string;
      role: AppRole;
      client: SupabaseClient;
    }
  | { ok: false; response: Response };

function fail(status: number, message: string): { ok: false; response: Response } {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  };
}

/**
 * Verifies the bearer token, resolves the caller's role from public.user_roles,
 * and only returns ok=true if the role is in `allowed`. Always returns generic
 * messages so the response never reveals whether the user exists or what role
 * they actually have.
 */
export async function requireRole(
  req: Request,
  allowed: AppRole[],
): Promise<RequireRoleResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return fail(401, "Unauthorized");

  const token = authHeader.slice("Bearer ".length);
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: claimsData, error: claimsError } = await client.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) return fail(401, "Unauthorized");

  const userId = claimsData.claims.sub as string;

  // Use the security-definer has_role function in a loop rather than reading
  // user_roles directly so we never bypass policy intent.
  let resolvedRole: AppRole | null = null;
  for (const role of allowed) {
    const { data, error } = await client.rpc("has_role", {
      _user_id: userId,
      _role: role,
    });
    if (error) return fail(500, "Authorization check failed");
    if (data === true) {
      resolvedRole = role;
      break;
    }
  }

  if (!resolvedRole) return fail(403, "Forbidden");

  return { ok: true, userId, role: resolvedRole, client };
}

export { corsHeaders };
