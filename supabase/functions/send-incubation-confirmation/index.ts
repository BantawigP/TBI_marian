// @ts-nocheck
// Edge Function: send-incubation-confirmation
// Sends a registration confirmation email to each founder of a newly submitted startup.
// Founders are emailed one at a time with a 1.5-second delay between each to avoid Resend rate limits.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface FounderRecipient {
  name: string;
  email: string;
}

interface Payload {
  startupName: string;
  founders: FounderRecipient[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = Deno.env.get("RESEND_FROM") || "MARIAN TBI <no-reply@mariantbi.uic.edu.ph>";
const DELAY_MS = 1500; // 1.5 seconds between each email

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const renderConfirmationHtml = (founderName: string, startupName: string) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="padding:0;">
            <!-- Header banner -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:linear-gradient(135deg,#FF2B5E,#FF6B8E);">
              <tr>
                <td style="padding:28px 28px 24px 28px;">
                  <p style="margin:0 0 4px 0;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.5px;">MARIAN TBI Connect</p>
                  <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">Startup Registration Received</h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 14px 0;font-size:15px;color:#374151;">Hello <strong>${founderName}</strong>,</p>
            <p style="margin:0 0 14px 0;font-size:15px;color:#374151;">
              We're excited to let you know that the startup registration for <strong>${startupName}</strong> has been successfully received by the MARIAN Technology Business Incubator.
            </p>
            <p style="margin:0 0 20px 0;font-size:15px;color:#374151;">
              Our team will review your application and reach out to you soon regarding the next steps in the incubation process.
            </p>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff5f7;border:1px solid #fecdd3;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#FF2B5E;text-transform:uppercase;letter-spacing:0.5px;">What happens next?</p>
                  <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.7;">
                    <li>Our team reviews your startup details</li>
                    <li>You will be contacted for an orientation session</li>
                    <li>Upon approval, you'll be onboarded into the TBI program</li>
                  </ul>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px 0;font-size:15px;color:#374151;">
              If you have any questions, feel free to reach out to us at
              <a href="mailto:support@mariantbi.uic.edu.ph" style="color:#FF2B5E;text-decoration:none;font-weight:600;">support@mariantbi.uic.edu.ph</a>.
            </p>

            <p style="margin:0;font-size:13px;color:#9ca3af;">Best regards,<br /><strong style="color:#374151;">MARIAN TBI Connect Team</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              © 2026 MARIAN TBI Connect · University of the Immaculate Conception<br />
              This is an automated confirmation. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

const renderConfirmationText = (founderName: string, startupName: string) => `
MARIAN TBI Connect

Hello ${founderName},

We're excited to let you know that the startup registration for "${startupName}" has been successfully received by the MARIAN Technology Business Incubator.

Our team will review your application and reach out to you soon regarding the next steps in the incubation process.

What happens next?
- Our team reviews your startup details
- You will be contacted for an orientation session
- Upon approval, you'll be onboarded into the TBI program

If you have any questions, feel free to reach out to us at support@mariantbi.uic.edu.ph.

Best regards,
MARIAN TBI Connect Team

© 2026 MARIAN TBI Connect · University of the Immaculate Conception
This is an automated confirmation. Please do not reply to this email.
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

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { startupName, founders } = payload;

  if (!startupName?.trim()) {
    return new Response(JSON.stringify({ error: "Missing 'startupName'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(founders) || founders.length === 0) {
    return new Response(JSON.stringify({ error: "Missing or empty 'founders' array" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { email: string; status: "sent" | "failed"; error?: string }[] = [];

  for (let i = 0; i < founders.length; i++) {
    const founder = founders[i];

    // Delay between sends (skip delay for the first email)
    if (i > 0) {
      await sleep(DELAY_MS);
    }

    const firstName = founder.name?.trim().split(" ")[0] || "there";
    const html = renderConfirmationHtml(firstName, startupName.trim());
    const text = renderConfirmationText(firstName, startupName.trim());

    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          to: founder.email.trim().toLowerCase(),
          subject: `Registration Confirmed – ${startupName.trim()} | MARIAN TBI`,
          from: DEFAULT_FROM,
          html,
          text,
        }),
      });

      if (!resendRes.ok) {
        const errorText = await resendRes.text();
        console.error(`Resend error for ${founder.email}:`, errorText);
        results.push({ email: founder.email, status: "failed", error: errorText });
      } else {
        results.push({ email: founder.email, status: "sent" });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Email send exception for ${founder.email}:`, errMsg);
      results.push({ email: founder.email, status: "failed", error: errMsg });
    }
  }

  const sentCount = results.filter((r) => r.status === "sent").length;
  const failedCount = results.filter((r) => r.status === "failed").length;

  return new Response(
    JSON.stringify({
      message: `Sent ${sentCount}/${founders.length} confirmation emails`,
      sentCount,
      failedCount,
      results,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
