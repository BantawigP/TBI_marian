// Edge Function: event-rsvp
// Confirms RSVP using a token, updates invite token row, and marks event_participants.rsvp_status.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RsvpStatus = "going" | "pending" | "not_going";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const lookupAlumniIdByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from("alumni")
    .select("alumni_id,email_address:email_address(email)")
    .eq("email_address.email", email)
    .maybeSingle();

  if (error) {
    console.error("Lookup alumni by email failed", error);
    return null;
  }

  const alumniId = (data as any)?.alumni_id;
  return typeof alumniId === "number" ? alumniId : null;
};

const renderHtml = (status: RsvpStatus) => {
  const palette = status === "going"
    ? { title: "You're in!", color: "#16a34a" }
    : status === "not_going"
      ? { title: "Maybe next time", color: "#ef4444" }
      : { title: "Thanks, noted", color: "#f59e0b" };

  return `
  <html>
    <body style="font-family:Arial,Helvetica,sans-serif;background:#f9fafb;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,0.06);">
        <h2 style="margin:0 0 12px 0;color:${palette.color};">${palette.title}</h2>
        <p style="margin:0;color:#374151;">Your response has been recorded.</p>
      </div>
    </body>
  </html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch (_err) {
      body = {};
    }
  }

  const token = url.searchParams.get("token") || (body.token as string | undefined);
  const statusRaw = url.searchParams.get("status") || (body.status as string | undefined);

  if (!token || !statusRaw) {
    return new Response(JSON.stringify({ error: "Missing token or status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const status = (statusRaw === "going" || statusRaw === "not_going" || statusRaw === "pending")
    ? (statusRaw as RsvpStatus)
    : null;

  if (!status) {
    return new Response(JSON.stringify({ error: "Invalid status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tokenHash = await hashToken(token);
  const nowIso = new Date().toISOString();

  const { data: invite, error: lookupError } = await supabase
    .from("event_invite_tokens")
    .select("event_id,email,alumni_id,expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError) {
    console.error("Token lookup failed", lookupError);
    return new Response(JSON.stringify({ error: "Lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!invite) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (invite.expires_at && invite.expires_at < nowIso) {
    return new Response(JSON.stringify({ error: "Token expired" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventId = Number((invite as any).event_id);
  const email = (invite as any).email as string;
  const alumniIdFromToken = (invite as any).alumni_id as number | null;
  const alumniId = alumniIdFromToken ?? (await lookupAlumniIdByEmail(email));

  // Update token row
  const { error: updateTokenError } = await supabase
    .from("event_invite_tokens")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  if (updateTokenError) {
    console.error("Failed updating token row", updateTokenError);
  }

  // Update or insert participant row so RSVP status is reflected on the event
  if (Number.isFinite(eventId) && alumniId) {
    const applyStatus = async () => {
      const { data, error } = await supabase
        .from("event_participants")
        .update({ rsvp_status: status })
        .eq("event_id", eventId)
        .eq("alumni_id", alumniId)
        .select("event_id");

      if (error && (error.code === "42703" || error.code === "PGRST204")) {
        console.warn("rsvp_status column missing; falling back to upsert without status");
        const { error: fallbackError } = await supabase
          .from("event_participants")
          .upsert({ event_id: eventId, alumni_id: alumniId }, { onConflict: "event_id,alumni_id" });
        if (fallbackError) {
          console.error("Failed fallback upsert without status", fallbackError);
        }
        return;
      }

      if (error) {
        console.error("Failed updating participant status", error);
        return;
      }

      // If no existing row was updated, insert one with status
      const wasUpdated = Array.isArray(data) && data.length > 0;
      if (!wasUpdated) {
        const { error: insertError } = await supabase
          .from("event_participants")
          .upsert({ event_id: eventId, alumni_id: alumniId, rsvp_status: status }, { onConflict: "event_id,alumni_id" });

        if (insertError && (insertError.code === "42703" || insertError.code === "PGRST204")) {
          console.warn("rsvp_status column missing on insert; inserting without status");
          const { error: fallbackInsertError } = await supabase
            .from("event_participants")
            .upsert({ event_id: eventId, alumni_id: alumniId }, { onConflict: "event_id,alumni_id" });
          if (fallbackInsertError) {
            console.error("Failed fallback insert without status", fallbackInsertError);
          }
        } else if (insertError) {
          console.error("Failed inserting participant status", insertError);
        }
      }
    };

    await applyStatus();
  }

  return new Response(renderHtml(status), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html" },
  });
});
