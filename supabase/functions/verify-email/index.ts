// Edge Function: verify-email
// Validates a token, marks contact as verified, and deletes the token.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
      return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tokenHash = await hashToken(token);
    const nowIso = new Date().toISOString();

    const { data: record, error: lookupError } = await supabase
      .from("email_verification_tokens")
      .select("email, expires_at")
      .eq("token_hash", tokenHash)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (lookupError) {
      console.error("Lookup error", lookupError);
      return new Response(JSON.stringify({ error: "Lookup failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!record) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark the email as verified in email_address (the app maps this boolean to Verified/Unverified).
    const { error: updateError } = await supabase
      .from("email_address")
      .upsert({ email: record.email, status: true }, { onConflict: "email" });

    if (updateError) {
      console.error("Update error", updateError);
      return new Response(JSON.stringify({ error: "Failed to mark verified" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("email_verification_tokens").delete().eq("token_hash", tokenHash);

    return new Response(JSON.stringify({ email: record.email }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
