// Edge Function: send-verification-email
// Generates a one-time token, stores its hash, builds a tokenized verify URL, and sends via Resend.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Payload {
  to: string;
  subject?: string;
  firstName?: string;
  brandName?: string;
  verifyUrl?: string; // optional: fully built URL; if absent we build APP_URL/verify-email?token=...
  from?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = Deno.env.get("RESEND_FROM") || "Marian Alumni <no-reply@mariantbi.uic.edu.ph>";
// Default APP_URL to localhost for dev; override via secret in prod.
const APP_URL = (Deno.env.get("APP_URL") || "http://localhost:5173").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const hashToken = async (token: string) => {
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const renderVerifyEmailHTML = ({
  firstName = "there",
  verifyUrl,
  brandName = "Marian Alumni Network",
}: Required<Pick<Payload, "verifyUrl">> & Partial<Payload>) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#6b7280;">${brandName}</p>
            <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Verify your email</h1>
            <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi ${firstName},</p>
            <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">Please confirm your email to activate your alumni profile.</p>
            <p style="margin:0 0 24px 0;">
              <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#FF2B5E;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                Verify email
              </a>
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">If the button doesn't work, copy and paste this link:</p>
            <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">${verifyUrl}</p>
            <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">If you didn't request this, you can ignore this email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

const renderVerifyEmailText = ({
  firstName = "there",
  verifyUrl,
  brandName = "Marian Alumni Network",
}: Required<Pick<Payload, "verifyUrl">> & Partial<Payload>) => `
${brandName}

Hi ${firstName},

Please confirm your email to activate your alumni profile.
Verify: ${verifyUrl}

If you didn't request this, you can ignore this email.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase server configuration missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { to, firstName, brandName, verifyUrl, subject = "Please verify your email", from } = payload;

  if (!to) {
    return new Response(JSON.stringify({ error: "Missing 'to'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate token and store hash
  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const finalVerifyUrl = (verifyUrl || `${APP_URL}/verify-email?token=${token}`).trim();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24h

  const { error: insertError } = await supabase.from("email_verification_tokens").insert({
    email: to,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("Insert error", insertError);
    return new Response(
      JSON.stringify({ error: "Failed to store token", detail: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const html = renderVerifyEmailHTML({ firstName, brandName, verifyUrl: finalVerifyUrl });
  const text = renderVerifyEmailText({ firstName, brandName, verifyUrl: finalVerifyUrl });

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      to,
      subject,
      from: from || DEFAULT_FROM,
      html,
      text,
    }),
  });

  if (!resendRes.ok) {
    const errorText = await resendRes.text();
    console.error("Resend error", errorText);
    return new Response(JSON.stringify({ error: "Resend request failed", detail: errorText }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await resendRes.json();

  return new Response(JSON.stringify({ message: "sent", result }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});