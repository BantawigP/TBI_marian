import { supabase } from './supabaseClient';

/**
 * Manually link the current authenticated user to their team member record
 * This is useful for users who signed in before the auto-linking was set up
 */
export async function linkMyAccountToTeam(): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('link_my_account_to_team');

    if (error) {
      console.error('Error linking account to team:', error);
      throw new Error(error.message);
    }

    return data || { success: false, message: 'No response from server' };
  } catch (error) {
    console.error('Failed to link account:', error);
    throw error;
  }
}
