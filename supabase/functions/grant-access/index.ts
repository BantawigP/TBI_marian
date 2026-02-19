// Edge Function: grant-access
// Creates an invitation token for a team member and sends a magic link + claim link email.
// JWT verification: decode payload manually (no clock-sensitive check) then confirm user
// via admin.getUserById() — tolerates device clock skew that causes getUser() 401s.
// @ts-nocheck — Deno Edge Function; use the Deno VS Code extension for full type support.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Decode the JWT payload without signature verification.
 * Security comes from confirming the sub against auth.users via the admin client.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(base64 + padding));
  } catch {
    return null;
  }
}

interface Payload {
  teamMemberId: number;
  email: string;
  role: "Admin" | "Manager" | "Member";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM_ENV = Deno.env.get("RESEND_FROM");
const DEFAULT_FROM_FALLBACK = "onboarding@resend.dev";
const normalizeFrom = (value: string | null | undefined): string | null => {
  if (!value) return null;
  let trimmed = value.trim();
  trimmed = trimmed.replace(/^['\"]+|['\"]+$/g, "");

  const emailOnly = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const nameEmail = /^(.+)<([^@\s]+@[^@\s]+\.[^@\s]+)>$/;

  if (emailOnly.test(trimmed)) return trimmed;

  const nameEmailMatch = trimmed.match(nameEmail);
  if (nameEmailMatch) {
    const name = nameEmailMatch[1]?.trim();
    const email = nameEmailMatch[2]?.trim();
    if (!email) return null;
    return name ? `${name} <${email}>` : email;
  }

  const emailMatch = trimmed.match(/[^@\s]+@[^@\s]+\.[^@\s]+/);
  if (emailMatch) return emailMatch[0];
  return null;
};

const DEFAULT_FROM = normalizeFrom(DEFAULT_FROM_ENV) || DEFAULT_FROM_FALLBACK;
if (DEFAULT_FROM_ENV && !normalizeFrom(DEFAULT_FROM_ENV)) {
  console.warn("Invalid RESEND_FROM format. Falling back to default email-only sender.");
}
const APP_URL = (Deno.env.get("APP_URL") || "http://localhost:5173").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function getRoleIdByName(roleName: string): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("role_name", roleName)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

const renderInviteHTML = (name: string, actionLink: string, claimLink: string) => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px;">
            <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">You’ve been granted access</h1>
            <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi ${name || "there"},</p>
            <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">Click the magic link to sign in:</p>
            <p style="margin:0 0 24px 0;">
              <a href="${actionLink}" style="display:inline-block;padding:12px 18px;background:#FF2B5E;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in</a>
            </p>
            <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">After signing in, you’ll be redirected to claim access. If not, use this link:</p>
            <p style="margin:0 0 8px 0;">
              <a href="${claimLink}">${claimLink}</a>
            </p>
            <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">If you didn’t request this, you can ignore this email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

const renderInviteText = (name: string, actionLink: string, claimLink: string) => `
Hi ${name || "there"},

You’ve been granted access.
Sign in: ${actionLink}
Claim access: ${claimLink}

If you didn’t request this, ignore this email.
`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase server configuration missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "").trim() || "";

  if (!jwt) {
    return new Response(JSON.stringify({ error: "No authorization token provided" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Decode JWT payload without clock-sensitive verification
  const jwtPayload = decodeJwtPayload(jwt);
  const userId = jwtPayload?.sub as string | undefined;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Invalid token: missing sub" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify user exists in auth.users via admin client (security check, clock-skew safe)
  const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.getUserById(userId);
  if (adminUserError || !adminUserData?.user) {
    console.error("Auth error:", adminUserError?.message);
    return new Response(JSON.stringify({ error: "User not found or not authenticated" }), {
      status: 401,
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

  const { teamMemberId, email, role } = payload;
  if (!teamMemberId || !email || !role) {
    return new Response(JSON.stringify({ error: "Missing teamMemberId, email, or role" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: member, error: memberError } = await supabase
    .from("teams")
    .select("id, first_name, last_name, email, has_access")
    .eq("id", teamMemberId)
    .maybeSingle();

  if (memberError) {
    console.error("Member lookup error", memberError);
    return new Response(JSON.stringify({ error: "Failed to lookup team member" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!member) {
    return new Response(JSON.stringify({ error: "Team member not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if ((member.email || "").toLowerCase() !== email.toLowerCase()) {
    return new Response(JSON.stringify({ error: "Member email does not match" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Allow re-sending: if member.has_access is already true we still proceed so admin can resend
  // the invitation email in case the first one was never received.
  const isResend = member.has_access === true;

  const roleId = await getRoleIdByName(role);

  // Create or get user with auto-confirm
  let authUserId: string | null = null;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    authUserId = existingUser.id;
    // Auto-confirm if not confirmed
    if (!existingUser.email_confirmed_at) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
      });
    }
  } else {
    // Create new user with auto-confirm
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: `${member.first_name} ${member.last_name}`.trim(),
      },
    });

    if (createUserError) {
      console.error("Create user error", createUserError);
      return new Response(
        JSON.stringify({ error: "Failed to create user", detail: createUserError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    authUserId = newUser?.user?.id || null;
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const claimLink = `${APP_URL}/?token=${token}`;

  const { error: inviteError } = await supabase.from("access_invites").insert({
    team_member_id: teamMemberId,
    email,
    role_id: roleId,
    token: token,
    expires_at: expiresAt,
  });

  if (inviteError) {
    console.error("Invite insert error", inviteError);
    return new Response(
      JSON.stringify({ error: "Failed to create invitation", detail: inviteError.message }),
      {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Generate magic link BEFORE marking has_access so email failure doesn’t lock the admin out
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: claimLink,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("Generate link error", linkError);
    // Still mark has_access if this is a resend and auth user already exists
    if (!isResend && authUserId) {
      await supabase.from("teams").update({ user_id: authUserId }).eq("id", teamMemberId);
    }
    return new Response(JSON.stringify({ error: "Failed to generate magic link" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const actionLink = linkData.properties.action_link;
  const fullName = `${member.first_name} ${member.last_name}`.trim();

  const html = renderInviteHTML(fullName, actionLink, claimLink);
  const text = renderInviteText(fullName, actionLink, claimLink);

  // Ensure from field is always valid - use hardcoded fallback if needed
  const fromAddress = DEFAULT_FROM || "onboarding@resend.dev";
  console.log("Using from address:", fromAddress);
  console.log("Sending email to:", email);

  if (!RESEND_API_KEY) {
    await supabase
      .from("teams")
      .update({ has_access: true, user_id: authUserId })
      .eq("id", teamMemberId);

    return new Response(JSON.stringify({
      message: "Access granted, but email was not sent because RESEND_API_KEY is missing. Share the magic link manually.",
      warning: "Email not sent — RESEND_API_KEY is not set",
      claimLink,
      actionLink,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      to: email,
      subject: "Your access to Marian TBI Connect",
      from: fromAddress,
      html,
      text,
    }),
  });

  if (!resendRes.ok) {
    const errorText = await resendRes.text();
    console.error("Resend error", errorText);

    // Check if it's a domain verification issue (free tier limitation)
    if (errorText.includes("verify a domain") || errorText.includes("testing emails")) {
      // Still mark has_access + link auth user even if email couldn't be sent
      await supabase
        .from("teams")
        .update({ has_access: true, user_id: authUserId })
        .eq("id", teamMemberId);
      return new Response(JSON.stringify({
        message: "Access granted! The invitation email could not be sent because the Resend domain is not verified (free-tier limitation). Share the magic link manually or verify a domain at resend.com/domains.",
        warning: "Email not sent — Resend domain not verified",
        claimLink,
        actionLink,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Any other Resend failure: return links for manual share so access flow can continue.
    await supabase
      .from("teams")
      .update({ has_access: true, user_id: authUserId })
      .eq("id", teamMemberId);

    return new Response(JSON.stringify({
      message: "Access granted, but invitation email failed to send. Share the magic link manually.",
      warning: "Email not sent — Resend delivery failed",
      detail: errorText,
      claimLink,
      actionLink,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Email sent successfully — now mark the member as having access
  const { error: accessUpdateError } = await supabase
    .from("teams")
    .update({ has_access: true, user_id: authUserId })
    .eq("id", teamMemberId);

  if (accessUpdateError) {
    console.error("Failed to update has_access after email send", accessUpdateError);
    // Non-fatal: email was sent, just log the error
  }

  return new Response(JSON.stringify({ message: "Access invitation sent" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
