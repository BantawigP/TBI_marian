// @ts-nocheck

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

type SendVerificationRequest = {
  to: string;
  subject?: string;
  firstName?: string;
  brandName?: string;
};

const getEnv = () => ({
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  SENDGRID_API_KEY: Deno.env.get("SENDGRID_API_KEY"),
  SENDGRID_FROM_EMAIL: Deno.env.get("SENDGRID_FROM_EMAIL"),
  SENDGRID_FROM_NAME: Deno.env.get("SENDGRID_FROM_NAME") ?? "Marian Alumni Network",
  PUBLIC_SITE_URL: Deno.env.get("PUBLIC_SITE_URL"),
});

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const base64UrlEncode = (bytes: Uint8Array) => {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const sha256Hex = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const renderHtml = (args: { firstName: string; verifyUrl: string; brandName: string }) => {
  const { firstName, verifyUrl, brandName } = args;
  return `
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
};

const renderText = (args: { firstName: string; verifyUrl: string; brandName: string }) => {
  const { firstName, verifyUrl, brandName } = args;
  return `${brandName}

Hi ${firstName},

Please confirm your email to activate your alumni profile.
Verify: ${verifyUrl}

If you didn't request this, you can ignore this email.
`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME,
    PUBLIC_SITE_URL,
  } = getEnv();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL || !PUBLIC_SITE_URL) {
    console.error("Missing required env", { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY, SENDGRID_API_KEY: !!SENDGRID_API_KEY, SENDGRID_FROM_EMAIL: !!SENDGRID_FROM_EMAIL, PUBLIC_SITE_URL: !!PUBLIC_SITE_URL });
    return new Response("Server not configured", { status: 500, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let body: SendVerificationRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const to = (body.to ?? "").trim().toLowerCase();
  const subject = body.subject ?? "Please verify your email";
  const firstName = (body.firstName ?? "there").trim() || "there";
  const brandName = (body.brandName ?? "Marian Alumni Network").trim() || "Marian Alumni Network";

  if (!to) return new Response("Missing 'to'", { status: 400, headers: corsHeaders });

  // Create a random token (sent to user) and store only a hash.
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = base64UrlEncode(tokenBytes);
  const tokenHash = await sha256Hex(token);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: tokenInsertError } = await supabaseAdmin
    .from("email_verification_tokens")
    .insert({ email: to, token_hash: tokenHash, expires_at: expiresAt });

  if (tokenInsertError) {
    console.error("Token insert failed", tokenInsertError);
    return new Response("Failed to create verification token", { status: 500, headers: corsHeaders });
  }

  const verifyUrl = `${PUBLIC_SITE_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;

  const html = renderHtml({ firstName, verifyUrl, brandName });
  const text = renderText({ firstName, verifyUrl, brandName });

  const sendgridPayload = {
    personalizations: [{ to: [{ email: to }], subject }],
    from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
    content: [
      { type: "text/plain", value: text },
      { type: "text/html", value: html },
    ],
  };

  const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sendgridPayload),
  });

  if (!sgRes.ok) {
    const msg = await sgRes.text();
    console.error("SendGrid error", msg);
    return new Response("Failed to send email", { status: 502, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
