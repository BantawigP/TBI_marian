import { useEffect, type MutableRefObject } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { setCachedSession } from '../../../lib/sessionCache';
import { linkMyAccountToTeam } from '../services/linkAccountService';
import { deriveUserProfile } from '../services/authProfile';

interface CachedSession {
  accessToken: string;
  user: any;
}

interface UseAuthSessionSyncParams {
  setShowClaimAccess: (value: boolean) => void;
  setIsLoggedIn: (value: boolean) => void;
  setCurrentUserName: (value: string) => void;
  setCurrentUserEmail: (value: string) => void;
  setSyncError: (value: string | null) => void;
  cachedSessionRef: MutableRefObject<CachedSession | null>;
}

export function useAuthSessionSync({
  setShowClaimAccess,
  setIsLoggedIn,
  setCurrentUserName,
  setCurrentUserEmail,
  setSyncError,
  cachedSessionRef,
}: UseAuthSessionSyncParams) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('token')) {
      setShowClaimAccess(true);
    }
  }, [setShowClaimAccess]);

  useEffect(() => {
    let isMounted = true;

    const rememberMe = () => localStorage.getItem('remember_me') === 'true';
    const loginInitiated = () => localStorage.getItem('login_initiated') === 'true';

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;

      const isOAuthReturn = localStorage.getItem('auth_method') === 'oauth';

      if (data.session && !rememberMe() && !loginInitiated() && !isOAuthReturn) {
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        return;
      }

      if (data.session) {
        const { name, email } = deriveUserProfile(data.session.user);
        setCurrentUserEmail(email);
        setCurrentUserName(name);
      }

      setIsLoggedIn(rememberMe() || isOAuthReturn ? !!data.session : false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        if (!session) {
          setIsLoggedIn(false);
          return;
        }

        const allowAutoLogin = rememberMe();
        const hasLoginIntent = loginInitiated();

        if (_event === 'INITIAL_SESSION' && !allowAutoLogin && !hasLoginIntent) {
          setIsLoggedIn(false);
          return;
        }

        if (hasLoginIntent) {
          localStorage.removeItem('login_initiated');
        }

        const { name, email } = deriveUserProfile(session.user);
        setCurrentUserEmail(email);
        setCurrentUserName(name);

        const isGoogleOAuth = localStorage.getItem('pending_google_oauth') === 'true';

        if (isGoogleOAuth) {
          localStorage.removeItem('pending_google_oauth');

          const googleEmail = (session.user?.email || '').toLowerCase();
          if (!googleEmail) {
            await supabase.auth.signOut();
            setIsLoggedIn(false);
            setSyncError('Could not determine email from Google account.');
            return;
          }

          const { data: teamRow, error: teamError } = await supabase
            .from('teams')
            .select('id, has_access')
            .ilike('email', googleEmail)
            .maybeSingle();

          if (teamError) {
            console.error('Teams lookup error after Google OAuth:', teamError);
          }

          const isAllowed = Boolean(teamRow?.id) && Boolean(teamRow?.has_access);

          if (!isAllowed) {
            await supabase.auth.signOut();
            setIsLoggedIn(false);
            setSyncError(
              'This Google account is not authorized. Ask your admin to add your email to the team first.'
            );
            return;
          }
        }

        cachedSessionRef.current = { accessToken: session.access_token, user: session.user };
        setCachedSession(session.access_token, session.user);

        try {
          await linkMyAccountToTeam(session.user, session.access_token);
        } catch (e) {
          console.warn('Account linking failed (role-based features may not work):', e);
        }

        setIsLoggedIn(true);
      }
    );

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [
    cachedSessionRef,
    setCurrentUserEmail,
    setCurrentUserName,
    setIsLoggedIn,
    setSyncError,
  ]);
}
