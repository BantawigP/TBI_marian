// Edge Function: send-mass-email
// Sends mass broadcast emails for events that do not require RSVP links.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 1800;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const renderEmailHtml = (event: EventPayload) => {

  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 12px 0;font-size:14px;color:#6b7280;">MARIAN Alumni Network</p>
              <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">${event.title}</h1>
              <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">Hi everyone,</p>
              <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">This is a mass update from MARIAN Alumni Network.</p>
              <p style="margin:0 0 14px 0;font-size:14px;color:#374151;">${event.description || ""}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
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

  const sendResults: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (let index = 0; index < payload.attendees.length; index += BATCH_SIZE) {
    const currentBatch = payload.attendees.slice(index, index + BATCH_SIZE);
    const batchEmails = currentBatch.map((attendee) => attendee.email).filter(Boolean);

    if (batchEmails.length === 0) {
      continue;
    }

    const [primaryRecipient, ...ccRecipients] = batchEmails;
    const html = renderEmailHtml(payload.event);
    const text = `${payload.event.title}\n\n${payload.event.description || ""}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        to: primaryRecipient,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        subject: `Update: ${payload.event.title}`,
        from: DEFAULT_FROM,
        html,
        text,
      }),
    });

    const batchResults = currentBatch.map((attendee) => ({
      email: attendee.email,
      ok: resendRes.ok,
      error: undefined as string | undefined,
    }));

    if (!resendRes.ok) {
      const body = await resendRes.text();
      for (const result of batchResults) {
        result.error = body;
      }
    }

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
