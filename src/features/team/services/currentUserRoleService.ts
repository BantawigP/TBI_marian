import { supabase } from '../../../lib/supabaseClient';
import { linkMyAccountToTeam } from '../../auth/services/linkAccountService';
import type { TeamRole } from '../../../types';

interface CachedSession {
  accessToken: string;
  user: any;
}

interface ResolveCurrentUserRoleContextParams {
  cachedSession?: CachedSession | null;
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

const deriveUserProfile = (user?: any) => {
  if (!user) {
    return { name: '', email: '' };
  }

  const metadata = user.user_metadata || {};
  const identityData = user.identities?.[0]?.identity_data || {};
  const email =
    user.email || metadata.email || metadata.preferred_email || identityData.email || '';
  const name =
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(' ') ||
    identityData.name ||
    email ||
    '';

  return { name, email };
};

const extractRoleName = (roleRow: any): TeamRole | null => {
  const rolesData = roleRow?.roles as { role_name?: string } | { role_name?: string }[] | null;
  const roleName = Array.isArray(rolesData)
    ? rolesData[0]?.role_name ?? null
    : rolesData?.role_name ?? null;
  return (roleName as TeamRole | null) ?? null;
};

const extractDepartmentName = (roleRow: any): string | null => {
  const deptData = roleRow?.departments as
    | { department_name?: string }
    | { department_name?: string }[]
    | null;
  return Array.isArray(deptData)
    ? deptData[0]?.department_name ?? null
    : deptData?.department_name ?? null;
};

export async function resolveCurrentUserRoleContext({
  cachedSession,
  fallbackName,
  fallbackEmail,
}: ResolveCurrentUserRoleContextParams): Promise<ResolveCurrentUserRoleContextResult> {
  let authUser: any = null;
  let accessToken: string | null = null;

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userError && userData?.user) {
      authUser = userData.user;
    }
  } catch {
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    accessToken = sessionData.session.access_token;
    if (!authUser) {
      authUser = sessionData.session.user;
    }
  }

  if (!accessToken && cachedSession?.accessToken) {
    accessToken = cachedSession.accessToken;
    console.log('resolveCurrentUserRoleContext: using cached session token (clock skew fallback)');
  }

  if (!authUser && cachedSession?.user) {
    authUser = cachedSession.user;
  }

  if (!authUser) {
    return {
      role: null,
      department: null,
      userName: fallbackName || '',
      userEmail: fallbackEmail || '',
      hasExistingPassword: false,
    };
  }

  const { name: derivedName, email: derivedEmail } = deriveUserProfile(authUser);
  const storedAuthMethod = localStorage.getItem('auth_method');
  const metadataHasPassword = Boolean(
    (authUser.user_metadata as { has_password?: boolean; password_set?: boolean } | undefined)
      ?.has_password ??
      (authUser.user_metadata as { has_password?: boolean; password_set?: boolean } | undefined)
        ?.password_set
  );
  const hasExistingPassword = storedAuthMethod === 'password' || metadataHasPassword;

  const userEmail = derivedEmail || authUser.email || '';

  let roleRow: any = null;
  let roleError: any = null;

  const { data: byUserId, error: byUserIdError } = await supabase
    .from('teams')
    .select('id, email, first_name, last_name, roles(role_name), departments(department_name)')
    .eq('user_id', authUser.id)
    .or('has_access.eq.true,has_access.is.null')
    .maybeSingle();

  if (!byUserIdError && byUserId) {
    roleRow = byUserId;
  } else if (userEmail) {
    const { data: byEmail, error: byEmailError } = await supabase
      .from('teams')
      .select('id, email, first_name, last_name, roles(role_name), departments(department_name)')
      .ilike('email', userEmail)
      .or('has_access.eq.true,has_access.is.null')
      .maybeSingle();

    if (byEmailError) {
      roleError = byEmailError;
    } else {
      roleRow = byEmail;
    }
  } else {
    roleError = byUserIdError;
  }

  if (roleError) {
    console.warn('Supabase: failed to load current user role via direct query', roleError);
  }

  if (!roleRow) {
    console.log('Direct role lookup failed, trying process-team-auth edge function...');
    const linkedRole = await linkMyAccountToTeam(authUser, accessToken ?? undefined);

    if (!linkedRole) {
      return {
        role: null,
        department: null,
        userName: derivedName || userEmail || '',
        userEmail,
        hasExistingPassword,
      };
    }

    const { data: retryRow } = await supabase
      .from('teams')
      .select('id, email, first_name, last_name, roles(role_name), departments(department_name)')
      .eq('user_id', authUser.id)
      .or('is_active.eq.true,is_active.is.null')
      .maybeSingle();

    if (!retryRow) {
      return {
        role: linkedRole as TeamRole,
        department: null,
        userName: derivedName || userEmail || '',
        userEmail,
        hasExistingPassword,
      };
    }

    const teamName = `${retryRow.first_name ?? ''} ${retryRow.last_name ?? ''}`.trim();
    const retryEmail = retryRow.email || userEmail;

    return {
      role: linkedRole as TeamRole,
      department: extractDepartmentName(retryRow),
      userName: teamName || derivedName || userEmail || '',
      userEmail: retryEmail,
      hasExistingPassword,
    };
  }

  const teamName = `${roleRow.first_name ?? ''} ${roleRow.last_name ?? ''}`.trim();

  return {
    role: extractRoleName(roleRow),
    department: extractDepartmentName(roleRow),
    userName: teamName || derivedName || userEmail || '',
    userEmail: roleRow.email || userEmail,
    hasExistingPassword,
  };
}
