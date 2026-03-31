import type { TeamRole } from '../../../types';

/**
 * CLONED APP (no-backend version):
 * Always returns an Admin role so all features are accessible for UI preview.
 */

interface ResolveCurrentUserRoleContextParams {
  cachedSession?: { accessToken: string; user: unknown } | null;
  fallbackName?: string;
  fallbackEmail?: string;
}

interface ResolveCurrentUserRoleContextResult {
  role: TeamRole | null;
  department: string | null;
  userName: string;
  userEmail: string;
  hasExistingPassword: boolean;
}

export async function resolveCurrentUserRoleContext(
  _params: ResolveCurrentUserRoleContextParams
): Promise<ResolveCurrentUserRoleContextResult> {
  return {
    role: 'Admin',
    department: 'Management',
    userName: 'Demo Admin',
    userEmail: 'admin@demo.com',
    hasExistingPassword: false,
  };
}
