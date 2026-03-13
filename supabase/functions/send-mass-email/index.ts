// Edge Function: send-mass-email
// Sends mass broadcast emails for events that do not require RSVP links.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EventPayload = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
};

type AttendeePayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  alumniId?: number;
};

type Payload = {
  event: EventPayload;
  attendees: AttendeePayload[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = Deno.env.get("RESEND_FROM") || "MARIAN TBI <no-reply@mariantbi.uic.edu.ph>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 1800;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizeLineBreaks = (value: string) => value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");

const toSafeError = (value?: string) => {
  if (!value) return null;
  return value.length > 1500 ? `${value.slice(0, 1500)}...` : value;
};

const persistDeliveryLogs = async (
  eventId: number,
  attendees: AttendeePayload[],
  batchResult: { ok: boolean; error?: string; providerMessageId?: string },
) => {
  if (!supabase) return;

  const attemptedAt = new Date().toISOString();
  const rows = attendees.map((attendee) => ({
    event_id: eventId,
    alumni_id: attendee.alumniId ?? null,
    email: attendee.email,
    delivery_channel: "mass_email",
    delivery_status: batchResult.ok ? "sent" : "failed",
    error_message: toSafeError(batchResult.error),
    provider: "resend",
    provider_message_id: batchResult.providerMessageId ?? null,
    attempted_at: attemptedAt,
  }));

  const { error } = await supabase.from("event_email_delivery_logs").insert(rows);
  if (error) {
    console.error("Failed to persist mass email delivery logs", {
      eventId,
      count: rows.length,
      message: error.message,
    });
  }
};

const renderEmailHtml = (event: EventPayload) => {
  const safeTitle = escapeHtml(event.title);
  const safeDescription = event.description ? escapeHtml(normalizeLineBreaks(event.description)) : "";

  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:linear-gradient(135deg,#FF2B5E,#FF6B8E);">
              <tr>
                <td style="padding:28px 28px 24px 28px;">
                  <p style="margin:0 0 4px 0;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.5px;">MARIAN TBI Connect</p>
                  <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">${safeTitle}</h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            ${safeDescription ? `<p style="margin:0 0 24px 0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${safeDescription}</p>` : ""}

            <p style="margin:0;font-size:13px;color:#9ca3af;">Best regards,<br /><strong style="color:#374151;">MARIAN TBI Connect Team</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              © 2026 MARIAN TBI Connect · University of the Immaculate Conception<br />
              This is an automated email. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `;
};

const renderEmailText = (event: EventPayload) => {
  const eventDescription = event.description ? normalizeLineBreaks(event.description) : "";

  return `
MARIAN TBI Connect

${event.title}

Hello everyone,

${eventDescription ? `\n${eventDescription}\n` : ""}

Best regards,
MARIAN TBI Connect Team

© 2026 MARIAN TBI Connect · University of the Immaculate Conception
This is an automated email. Please do not reply to this email.
`.trim();
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { ...corsHeaders } });
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

  if (!payload.event || !payload.attendees?.length) {
    return new Response(JSON.stringify({ error: "Missing event or attendees" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventId = Number(payload.event.id);
  if (!Number.isFinite(eventId)) {
    return new Response(JSON.stringify({ error: "event.id must be numeric" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sendResults: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (let index = 0; index < payload.attendees.length; index += BATCH_SIZE) {
    const currentBatch = payload.attendees.slice(index, index + BATCH_SIZE);
    const batchEmails = currentBatch.map((attendee) => attendee.email).filter(Boolean);

    if (batchEmails.length === 0) {
      continue;
    }

    const [primaryRecipient, ...ccRecipients] = batchEmails;
    const html = renderEmailHtml(payload.event);
    const text = renderEmailText(payload.event);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        to: primaryRecipient,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        subject: payload.event.title,
        from: DEFAULT_FROM,
        html,
        text,
      }),
    });

    let providerMessageId: string | undefined;
    let batchErrorText: string | undefined;

    if (resendRes.ok) {
      const responseJson = await resendRes.json().catch(() => null);
      providerMessageId = typeof responseJson?.id === "string" ? responseJson.id : undefined;
    } else {
      batchErrorText = await resendRes.text();
    }

    const batchResults = currentBatch.map((attendee) => ({
      email: attendee.email,
      ok: resendRes.ok,
      error: batchErrorText,
    }));

    await persistDeliveryLogs(eventId, currentBatch, {
      ok: resendRes.ok,
      error: batchErrorText,
      providerMessageId,
    });

    sendResults.push(...batchResults);

    const hasRemaining = index + BATCH_SIZE < payload.attendees.length;
    if (hasRemaining) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const failed = sendResults.filter((r) => !r.ok);
  if (failed.length) {
    console.error("Failed emails", failed);
  }

  return new Response(JSON.stringify({ message: "processed", failed }), {
    status: failed.length ? 207 : 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
