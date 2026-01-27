// @ts-nocheck

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

type VerifyEmailRequest = {
  token: string;
};

const getEnv = () => ({
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
});

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const sha256Hex = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required env", { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY });
    return new Response("Server not configured", { status: 500, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let body: VerifyEmailRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const token = (body.token ?? "").trim();
  if (!token) return new Response("Missing 'token'", { status: 400, headers: corsHeaders });

  const tokenHash = await sha256Hex(token);

  const { data: tokenRow, error: tokenSelectError } = await supabaseAdmin
    .from("email_verification_tokens")
    .select("id,email,expires_at,used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenSelectError) {
    console.error("Token lookup failed", tokenSelectError);
    return new Response("Verification failed", { status: 500, headers: corsHeaders });
  }

  if (!tokenRow) {
    return new Response("Invalid or expired token", { status: 400, headers: corsHeaders });
  }

  if (tokenRow.used_at) {
    return new Response("Token already used", { status: 400, headers: corsHeaders });
  }

  const expiresAt = new Date(tokenRow.expires_at);
  if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    return new Response("Invalid or expired token", { status: 400, headers: corsHeaders });
  }

  const email = (tokenRow.email as string).trim().toLowerCase();

  // Mark email as verified. Assumes `email_address.email` has a unique constraint.
  const { error: emailUpsertError } = await supabaseAdmin
    .from("email_address")
    .upsert({ email, status: true }, { onConflict: "email" });

  if (emailUpsertError) {
    console.error("Email update failed", emailUpsertError);
    return new Response("Failed to update email status", { status: 500, headers: corsHeaders });
  }

  const { error: markUsedError } = await supabaseAdmin
    .from("email_verification_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  if (markUsedError) {
    console.error("Failed to mark token used", markUsedError);
    return new Response("Failed to finalize verification", { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true, email }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
