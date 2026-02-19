// @ts-nocheck
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
  campaignType?: "initial" | "rapport";
  intervalMonths?: 1 | 3 | 6 | 12;
}

type RapportInterval = 1 | 3 | 6 | 12;

type EmailContent = {
  heading: string;
  intro: string;
  detail: string;
  ctaLabel: string;
  subject: string;
};

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

const isRapportInterval = (value: unknown): value is RapportInterval => value === 1 || value === 3 || value === 6 || value === 12;

const getEmailContent = (
  campaignType: "initial" | "rapport",
  intervalMonths: RapportInterval | null,
): EmailContent => {
  if (campaignType === "rapport" && intervalMonths) {
    const intervalCopy: Record<RapportInterval, EmailContent> = {
      1: {
        heading: "Please verify your email address",
        intro: "We’re excited to keep you connected with MARIAN TBI. To ensure you continue receiving exclusive invitations to our upcoming events, please verify your email address.",
        detail: "This quick step helps us maintain a secure and reliable system, ensuring you don’t miss out on future opportunities.",
        ctaLabel: "Verify your email",
        subject: "MARIAN TBI: 1-month email verification reminder",
      },
      3: {
        heading: "Three-month verification follow-up",
        intro: "Three months have passed since your last verification. To continue securing your access to future MARIAN TBI event invitations, please verify your email address again.",
        detail: "Your cooperation ensures uninterrupted access to our community and events.",
        ctaLabel: "Verify your email",
        subject: "MARIAN TBI: 3-month email verification follow-up",
      },
      6: {
        heading: "Six-month verification follow-up",
        intro: "Six months have passed since your last verification. To maintain your eligibility for future MARIAN TBI events, we kindly ask you to verify your email address once more.",
        detail: "This step helps us keep your connection secure and ensures you don’t miss out on upcoming opportunities.",
        ctaLabel: "Verify your email",
        subject: "MARIAN TBI: 6-month email verification follow-up",
      },
      12: {
        heading: "Annual verification reminder",
        intro: "It has been one year since your last verification. As part of our annual process, please verify your email address to continue receiving invitations to MARIAN TBI events.",
        detail: "We appreciate your cooperation and look forward to welcoming you to our future gatherings.",
        ctaLabel: "Verify your email",
        subject: "MARIAN TBI: annual email verification reminder",
      },
    };

    return intervalCopy[intervalMonths];
  }

  return {
    heading: "Verify your email",
    intro: "Thank you for completing the form.",
    detail: "To ensure we have the right person, please verify your email address by clicking the link below.",
    ctaLabel: "Verify email",
    subject: "Please verify your email",
  };
};

const renderVerifyEmailHTML = ({
  firstName = "there",
  verifyUrl,
  brandName = "Marian Alumni Network",
  content,
}: Required<Pick<Payload, "verifyUrl">> & Partial<Payload> & { content: EmailContent }) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#6b7280;">${brandName}</p>
            <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">${content.heading}</h1>
            <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Dear ${firstName},</p>
            <p style="margin:0 0 10px 0;font-size:15px;color:#374151;">${content.intro}</p>
            <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">${content.detail}</p>
            <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Click the link below to confirm:</p>
            <p style="margin:0 0 24px 0;">
              <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#FF2B5E;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
                ${content.ctaLabel}
              </a>
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">If the button doesn't work, copy and paste this link:</p>
            <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">${verifyUrl}</p>
            <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">If you did not request this, you can safely ignore this message.</p>
            <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">Best regards,<br />MARIAN TBI</p>
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
  content,
}: Required<Pick<Payload, "verifyUrl">> & Partial<Payload> & { content: EmailContent }) => `
${brandName}

Dear ${firstName},

${content.intro}
${content.detail}

Click the link below to confirm:
${verifyUrl}

If you did not request this, you can safely ignore this message.

Best regards,
MARIAN TBI
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

  const {
    to,
    firstName,
    brandName,
    verifyUrl,
    from,
    campaignType: campaignTypeRaw,
    intervalMonths,
  } = payload;

  const campaignType = campaignTypeRaw === "rapport" ? "rapport" : "initial";
  const normalizedInterval = isRapportInterval(intervalMonths) ? intervalMonths : null;

  if (campaignType === "rapport" && !normalizedInterval) {
    return new Response(JSON.stringify({ error: "Missing or invalid 'intervalMonths' for rapport campaign" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!to) {
    return new Response(JSON.stringify({ error: "Missing 'to'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate token and store hash
  const nowIso = new Date().toISOString();
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

  const content = getEmailContent(campaignType, normalizedInterval);
  const subject = payload.subject?.trim() || content.subject;

  const html = renderVerifyEmailHTML({ firstName, brandName, verifyUrl: finalVerifyUrl, content });
  const text = renderVerifyEmailText({ firstName, brandName, verifyUrl: finalVerifyUrl, content });

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

  const normalizedEmail = to.trim().toLowerCase();

  const { error: anchorError } = await supabase
    .from("verification_email_anchor")
    .upsert({ email: normalizedEmail, first_sent_at: nowIso }, { onConflict: "email", ignoreDuplicates: true });

  if (anchorError) {
    console.error("Failed to upsert verification email anchor", anchorError);
  }

  if (campaignType === "rapport" && normalizedInterval) {
    const { error: campaignLogError } = await supabase.from("reverification_campaign_log").upsert({
      email: normalizedEmail,
      interval_months: normalizedInterval,
      sent_at: nowIso,
      campaign_type: "rapport",
      status: "sent",
      error: null,
    }, {
      onConflict: "email,interval_months,campaign_type",
      ignoreDuplicates: true,
    });

    if (campaignLogError) {
      console.error("Failed to upsert campaign log", campaignLogError);
    }
  }

  const result = await resendRes.json();

  return new Response(JSON.stringify({ message: "sent", result }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});