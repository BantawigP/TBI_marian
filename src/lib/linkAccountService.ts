import { supabase } from './supabaseClient';

/**
 * After a successful Google OAuth sign-in, link the authenticated user
 * (auth.users.id) to their pre-added row in the public.teams table.
 *
 * This sets teams.user_id and teams.has_access = true so that
 * App.fetchCurrentUserRole() can resolve the user's role.
 *
 * If the user is already linked (user_id is set), this is a no-op.
 */
export async function linkMyAccountToTeam(): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    console.warn('linkMyAccountToTeam: no authenticated user', userError);
    return;
  }

  const email = user.email.toLowerCase();

  // Find the teams row whose email matches the authenticated user
  const { data: teamRow, error: lookupError } = await supabase
    .from('teams')
    .select('id, user_id, has_access')
    .ilike('email', email)
    .eq('is_active', true)
    .maybeSingle();

  if (lookupError) {
    console.warn('linkMyAccountToTeam: lookup failed', lookupError);
    return;
  }

  if (!teamRow) {
    console.warn('linkMyAccountToTeam: no teams row found for', email);
    return;
  }

  // Already linked — nothing to do
  if (teamRow.user_id === user.id) {
    return;
  }

  // Link the auth user to the teams row and grant access
  const { error: updateError } = await supabase
    .from('teams')
    .update({ user_id: user.id, has_access: true })
    .eq('id', teamRow.id);

  if (updateError) {
    console.error('linkMyAccountToTeam: failed to link account', updateError);
    throw updateError;
  }

  console.log('✓ Linked auth user to teams row', teamRow.id);
}
