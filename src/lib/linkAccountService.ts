import { supabase } from './supabaseClient';

/**
 * After a successful sign-in (any method), link the authenticated user
 * (auth.users.id) to their pre-added row in the public.teams table.
 *
 * This calls the process-team-auth Edge Function which uses the service role
 * key to bypass RLS — solving the chicken-and-egg problem where a user can't
 * update their own teams row because user_id isn't set yet.
 *
 * Returns the user's role if successfully linked, or null.
 *
 * @param user      - optional auth user object (id + email)
 * @param accessToken - optional JWT; pass this when the caller already has a
 *                      valid session (e.g. inside onAuthStateChange) to avoid
 *                      calling refreshSession() which can interfere with auth
 *                      state transitions and corrupt the stored session.
 */
type AuthUser = { id: string; email?: string | null };

export async function linkMyAccountToTeam(
  user?: AuthUser,
  accessToken?: string,
): Promise<string | null> {
  const authUser =
    user ?? (await supabase.auth.getSession()).data.session?.user ?? null;

  if (!authUser?.email) {
    console.warn('linkMyAccountToTeam: no authenticated user');
    return null;
  }

  // If the caller already provided a token, use it directly.
  // This avoids calling refreshSession() during onAuthStateChange which can
  // corrupt the session and cause "Auth session missing!" errors elsewhere.
  if (accessToken) {
    return callProcessTeamAuth(accessToken);
  }

  // No token provided — try to obtain one from the current session.
  // Prefer getSession() (reads from memory) over refreshSession() (API call).
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) {
    return callProcessTeamAuth(sessionData.session.access_token);
  }

  // Last resort: try refreshing (only when no session exists at all)
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshData?.session) {
    console.warn('linkMyAccountToTeam: no valid session');
    return null;
  }

  return callProcessTeamAuth(refreshData.session.access_token);
}

async function callProcessTeamAuth(accessToken: string): Promise<string | null> {
  try {
    // First attempt with the provided token
    let response = await fetchEdgeFunction(accessToken);

    // 401 = token expired/invalid — refresh and retry once
    if (response.status === 401) {
      console.log('linkMyAccountToTeam: token rejected (401), refreshing session and retrying...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData?.session) {
        console.warn('linkMyAccountToTeam: refresh failed', refreshError?.message);
        return null;
      }
      response = await fetchEdgeFunction(refreshData.session.access_token);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn('linkMyAccountToTeam: edge function failed', response.status, errorText);
      return null;
    }

    const result = await response.json();
    console.log('✓ linkMyAccountToTeam:', result.alreadyLinked ? 'already linked' : 'newly linked', '| role:', result.role);
    return result.role || null;
  } catch (err) {
    console.warn('linkMyAccountToTeam: network error', err);
    return null;
  }
}

async function fetchEdgeFunction(token: string): Promise<Response> {
  return fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-team-auth`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
}
