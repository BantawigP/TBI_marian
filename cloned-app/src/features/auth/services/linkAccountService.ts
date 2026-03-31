/**
 * CLONED APP (no-backend version):
 * Mock account linking – returns 'Admin' immediately without calling any
 * Supabase edge function.
 */
export async function linkMyAccountToTeam(
  _user?: { id: string; email?: string | null },
  _accessToken?: string
): Promise<string | null> {
  return 'Admin';
}
