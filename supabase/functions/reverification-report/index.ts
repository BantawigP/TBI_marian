// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReverificationInterval = 1 | 3 | 6 | 12;

type CampaignLogRow = {
  interval_months: ReverificationInterval;
  sent_at: string;
};

type AnchorRow = {
  first_sent_at: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const monthsBetween = (fromIso: string, toIso: string) => {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const approxDays = Math.max(0, (to - from) / (1000 * 60 * 60 * 24));
  return approxDays / 30.44;
};

const getNextDueInterval = (
  anchorIso: string,
  logs: CampaignLogRow[],
  nowIso: string,
): ReverificationInterval | null => {
  const sentIntervals = new Set(logs.map((entry) => entry.interval_months));
  const elapsedMonths = monthsBetween(anchorIso, nowIso);

  if (!sentIntervals.has(1) && elapsedMonths >= 1) {
    return 1;
  }

  if (!sentIntervals.has(3) && elapsedMonths >= 3) {
    return 3;
  }

  if (!sentIntervals.has(6) && elapsedMonths >= 6) {
    return 6;
  }

  if (!sentIntervals.has(12) && elapsedMonths >= 12) {
    return 12;
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { ...corsHeaders } });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase server configuration missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let dryRun = false;
  try {
    const body = await req.json().catch(() => ({}));
    dryRun = Boolean(body?.dryRun);
  } catch {
    dryRun = false;
  }

  const nowIso = new Date().toISOString();

  const { data: unverifiedRows, error: unverifiedError } = await supabase
    .from("email_address")
    .select("email")
    .eq("status", false);

  if (unverifiedError) {
    return new Response(JSON.stringify({ error: unverifiedError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dueList: Array<{ email: string; interval: ReverificationInterval }> = [];
  const inactiveCandidates: string[] = [];
  let skippedNoAnchor = 0;

  for (const row of unverifiedRows ?? []) {
    const email = (row as { email?: string }).email?.trim().toLowerCase();
    if (!email) continue;

    const { data: anchorRows, error: anchorError } = await supabase
      .from("verification_email_anchor")
      .select("first_sent_at")
      .eq("email", email)
      .limit(1);

    if (anchorError) {
      console.error("Failed to read verification anchor", { email, message: anchorError.message });
      continue;
    }

    const { data: logRows, error: logError } = await supabase
      .from("reverification_campaign_log")
      .select("interval_months,sent_at")
      .eq("email", email)
      .eq("campaign_type", "rapport")
      .eq("status", "sent")
      .order("sent_at", { ascending: true });

    if (logError) {
      console.error("Failed to read campaign logs", { email, message: logError.message });
      continue;
    }

    const logs = (logRows ?? []) as CampaignLogRow[];
    const anchorIso = (anchorRows?.[0] as AnchorRow | undefined)?.first_sent_at ?? logs[0]?.sent_at;

    if (!anchorIso) {
      skippedNoAnchor += 1;
      continue;
    }

    const nextInterval = getNextDueInterval(anchorIso, logs, nowIso);

    if (nextInterval) {
      dueList.push({ email, interval: nextInterval });
      continue;
    }

    const sentIntervals = new Set(logs.map((entry) => entry.interval_months));
    if (sentIntervals.has(12)) {
      inactiveCandidates.push(email);
    }
  }

  const results: Array<{ email: string; interval: ReverificationInterval; sent: boolean; error?: string }> = [];

  for (const item of dueList) {
    if (dryRun) {
      results.push({ email: item.email, interval: item.interval, sent: false });
      continue;
    }

    const { error: sendError } = await supabase.functions.invoke("send-verification-email", {
      body: {
        to: item.email,
        brandName: "Marian Alumni Network",
        campaignType: "rapport",
        intervalMonths: item.interval,
      },
    });

    if (sendError) {
      results.push({ email: item.email, interval: item.interval, sent: false, error: sendError.message });
      continue;
    }

    results.push({ email: item.email, interval: item.interval, sent: true });
  }

  return new Response(JSON.stringify({
    dryRun,
    unverifiedCount: (unverifiedRows ?? []).length,
    skippedNoAnchor,
    dueCount: dueList.length,
    sentCount: results.filter((item) => item.sent).length,
    inactiveCandidates,
    results,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
