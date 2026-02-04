// Edge Function: grant-access
// Creates an invitation token for a team member and sends a magic link + claim link email.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Payload {
  teamMemberId: number;
  email: string;
  role: "Manager" | "Member";
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

const hashToken = async (token: string) => {
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

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

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
  
  // Create a client with the user's JWT to verify authentication
  const userSupabase = createClient(
    SUPABASE_URL!,
    Deno.env.get("SUPABASE_ANON_KEY") || "",
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );
  
  const { data: userData, error: userError } = await userSupabase.auth.getUser();

  if (userError || !userData?.user) {
    console.error("Auth error:", userError);
    return new Response(JSON.stringify({ error: userError?.message || "Invalid JWT" }), {
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

  if (member.has_access === true) {
    return new Response(JSON.stringify({ error: "Member already has access" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const roleId = await getRoleIdByName(role);

  // Create or get user with auto-confirm
  let authUserId: string | null = null;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
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
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days
  const claimLink = `${APP_URL}/?claim=${token}`;

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

  const { error: accessUpdateError } = await supabase
    .from("teams")
    .update({ has_access: true, user_id: authUserId })
    .eq("id", teamMemberId);

  if (accessUpdateError) {
    console.error("Failed to update has_access", accessUpdateError);
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${APP_URL}`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("Generate link error", linkError);
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
      // Access was already granted, email just couldn't be sent
      return new Response(JSON.stringify({ 
        message: "Access granted successfully! However, the invitation email could not be sent due to Resend free tier limitations. Please share the magic link manually or verify a domain at resend.com/domains.",
        warning: "Email not sent - Resend domain not verified",
        claimLink: claimLink,
        actionLink: actionLink
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ error: "Resend request failed", detail: errorText }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: "Access invitation sent" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
