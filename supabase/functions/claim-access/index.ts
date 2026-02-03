// Edge Function: claim-access
// Validates a token and grants access to the team member.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const hashToken = async (token: string) => {
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  try {
    const body = await req.json();
    const token = body?.token as string | undefined;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();

    const { data: invite, error: lookupError } = await supabase
      .from("access_invites")
      .select("id, team_member_id, email, role_id, expires_at, used_at")
      .eq("token", token)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (lookupError) {
      console.error("Lookup error", lookupError);
      return new Response(JSON.stringify({ error: "Lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invite || invite.used_at) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate signed-in user
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "You must be signed in to claim access" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = (userData.user.email || "").toLowerCase();
    if (userEmail !== (invite.email || "").toLowerCase()) {
      return new Response(JSON.stringify({ error: "Signed-in email does not match invitation" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatePayload: Record<string, unknown> = {
      has_access: true,
      user_id: userData.user.id,
    };

    if (invite.role_id) {
      updatePayload.role_id = invite.role_id;
    }

    const { error: updateError } = await supabase
      .from("teams")
      .update(updatePayload)
      .eq("id", invite.team_member_id);

    if (updateError) {
      console.error("Update error", updateError);
      return new Response(JSON.stringify({ error: "Failed to grant access" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("access_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(JSON.stringify({ message: "Access granted" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
