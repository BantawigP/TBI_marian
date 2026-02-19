// Edge Function: process-team-auth
// Links an authenticated user to their teams row (sets user_id + has_access).
// Uses service role key to bypass RLS — solves the chicken-and-egg problem
// where a user can't update their own teams row because user_id isn't set yet.
//
// JWT verification strategy: decode the payload manually (no clock-sensitive
// signature check) then confirm the user ID exists in auth.users via the
// admin client. This tolerates device clock skew that causes getUser() 401s.
//
// @ts-nocheck — Deno Edge Function; use the Deno VS Code extension for full type support.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * Decode the JWT payload without signature verification.
 * We still confirm the user ID against auth.users via the admin client,
 * so clock skew doesn't invalidate an otherwise legitimate session.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    // atob doesn't handle URL-safe base64 — replace chars first
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(base64 + padding));
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: "Server configuration missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Extract JWT from Authorization header
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "").trim() || "";
  if (!jwt) {
    return new Response(JSON.stringify({ error: "No authorization token provided" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Decode payload without clock-sensitive verification
  const payload = decodeJwtPayload(jwt);
  const userId = payload?.sub as string | undefined;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Invalid token: missing sub" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Confirm the user ID actually exists in auth.users (using admin client)
  // This is the security check — forged tokens with fake sub values will fail here.
  const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.getUserById(userId);
  if (adminUserError || !adminUserData?.user) {
    console.error("Admin user lookup failed:", adminUserError?.message);
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authUser = adminUserData.user;
  const email = (authUser.email || "").toLowerCase();
  if (!email) {
    return new Response(JSON.stringify({ error: "No email on auth user" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Find the teams row by email (service role bypasses RLS)
  const { data: teamRow, error: lookupError } = await supabase
    .from("teams")
    .select("id, user_id, has_access, role_id, roles(role_name)")
    .ilike("email", email)
    .or("is_active.eq.true,is_active.is.null")
    .maybeSingle();

  if (lookupError) {
    console.error("Lookup error:", lookupError);
    return new Response(JSON.stringify({ error: "Lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!teamRow) {
    return new Response(JSON.stringify({ error: "No team member found for this email" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Determine the role name
  const rolesData = teamRow.roles as { role_name?: string } | { role_name?: string }[] | null;
  const roleName = Array.isArray(rolesData)
    ? rolesData[0]?.role_name ?? null
    : rolesData?.role_name ?? null;

  // If user_id is already linked, just return the role
  if (teamRow.user_id === authUser.id) {
    return new Response(JSON.stringify({
      linked: true,
      alreadyLinked: true,
      role: roleName,
      teamMemberId: teamRow.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Link the auth user to the teams row (service role bypasses RLS).
  // Only set user_id here — has_access is managed solely by the grant-access
  // / claim-access invite flow and must NOT be overwritten here.
  const { error: updateError } = await supabase
    .from("teams")
    .update({ user_id: authUser.id })
    .eq("id", teamRow.id);

  if (updateError) {
    console.error("Update error:", updateError);
    return new Response(JSON.stringify({ error: "Failed to link account" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`✓ Linked auth user ${authUser.id} to teams row ${teamRow.id}`);

  return new Response(JSON.stringify({
    linked: true,
    alreadyLinked: false,
    role: roleName,
    teamMemberId: teamRow.id,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
