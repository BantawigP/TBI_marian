// Edge Function: send-event-invite
// Sends event details (with static map + RSVP links) to attendees and stores hashed RSVP tokens.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RsvpStatus = "going" | "pending" | "not_going";

type EventPayload = {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
};

type AttendeePayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  alumniId?: number;
  rsvpStatus?: RsvpStatus;
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
const APP_URL = (Deno.env.get("APP_URL") || "http://localhost:5173").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RSVP_FUNCTION_URL =
  Deno.env.get("RSVP_FUNCTION_URL") ||
  (SUPABASE_URL ? SUPABASE_URL.replace("https://", "https://").replace(".supabase.co", ".functions.supabase.co") + "/event-rsvp" : "");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 1800;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hashToken = async (token: string) => {
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const formatDate = (dateStr: string, timeStr: string) => {
  const date = new Date(`${dateStr}T${timeStr}`);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const renderEmailHtml = (
  event: EventPayload,
  attendee: AttendeePayload,
  links: { yesUrl: string; maybeUrl: string; noUrl: string },
) => {
  const displayName = attendee.firstName || attendee.name || "there";
  const formattedDate = formatDate(event.date, event.time);
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 12px 0;font-size:14px;color:#6b7280;">MARIAN Alumni Network</p>
              <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">You're invited: ${event.title}</h1>
              <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">Hi ${displayName},</p>
              <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">Here are the details for the event. Let us know if you can make it.</p>
              <table role="presentation" style="width:100%;margin:16px 0 20px 0;border-collapse:separate;border-spacing:0;">
                <tr>
                  <td style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
                    <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;">Date & Time</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${formattedDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;margin-top:10px;">
                    <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;">Location</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${event.location}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 14px 0;font-size:14px;color:#374151;">${event.description || ""}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="${links.yesUrl}" style="display:inline-block;padding:12px 18px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Yes, I'm in</a>
                  </td>
                  <td style="padding-right:8px;">
                    <a href="${links.maybeUrl}" style="display:inline-block;padding:12px 18px;background:#fbbf24;color:#92400e;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Maybe</a>
                  </td>
                  <td>
                    <a href="${links.noUrl}" style="display:inline-block;padding:12px 18px;background:#ef4444;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Can't make it</a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0 0;font-size:12px;color:#9ca3af;">Your response updates our attendance list automatically.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
};

serve(async (req) => {
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

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(); // 72h

  // Prepare tokens
  const tokenRows = await Promise.all(
    payload.attendees.map(async (attendee) => {
      const token = crypto.randomUUID();
      const tokenHash = await hashToken(token);
      return {
        rawToken: token,
        event_id: eventId,
        email: attendee.email,
        alumni_id: attendee.alumniId ?? null,
        token_hash: tokenHash,
        status: "pending" as RsvpStatus,
        expires_at: expiresAt,
      };
    }),
  );

  const { error: upsertError } = await supabase
    .from("event_invite_tokens")
    .upsert(tokenRows.map(({ rawToken, ...row }) => row), { onConflict: "event_id,email" });

  if (upsertError) {
    console.error("Token upsert error", upsertError);
    return new Response(JSON.stringify({ error: "Failed to store RSVP tokens" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Send emails in batches (2 at a time) with delay between each batch
  const sendResults: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (let index = 0; index < tokenRows.length; index += BATCH_SIZE) {
    const currentBatch = tokenRows.slice(index, index + BATCH_SIZE);

    const batchResults = await Promise.all(
      currentBatch.map(async ({ rawToken, email }) => {
        const yesUrl = `${RSVP_FUNCTION_URL}?token=${rawToken}&status=going&eventId=${eventId}`;
        const maybeUrl = `${RSVP_FUNCTION_URL}?token=${rawToken}&status=pending&eventId=${eventId}`;
        const noUrl = `${RSVP_FUNCTION_URL}?token=${rawToken}&status=not_going&eventId=${eventId}`;

        const attendee = payload.attendees.find((a) => a.email === email)!;
        const html = renderEmailHtml(payload.event, attendee, { yesUrl, maybeUrl, noUrl });
        const text = `You're invited to ${payload.event.title}\n${formatDate(payload.event.date, payload.event.time)}\n${payload.event.location}\nYes: ${yesUrl}\nMaybe: ${maybeUrl}\nNo: ${noUrl}`;

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            to: email,
            subject: `Invitation: ${payload.event.title}`,
            from: DEFAULT_FROM,
            html,
            text,
          }),
        });

        if (!resendRes.ok) {
          const body = await resendRes.text();
          return { email, ok: false, error: body };
        }
        return { email, ok: true };
      }),
    );

    sendResults.push(...batchResults);

    const hasRemaining = index + BATCH_SIZE < tokenRows.length;
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
