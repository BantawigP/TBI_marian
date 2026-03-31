import { useEffect, type MutableRefObject } from 'react';
import { setCachedSession } from '../../../lib/sessionCache';

/**
 * CLONED APP (no-backend version):
 * Auto-logs in immediately with a mock session so the dashboard is always
 * visible without any Supabase credentials.
 */

interface CachedSession {
  accessToken: string;
  user: { id: string; email?: string | null };
}

interface UseAuthSessionSyncParams {
  setShowClaimAccess: (value: boolean) => void;
  setIsLoggedIn: (value: boolean) => void;
  setCurrentUserName: (value: string) => void;
  setCurrentUserEmail: (value: string) => void;
  setSyncError: (value: string | null) => void;
  cachedSessionRef: MutableRefObject<CachedSession | null>;
}

const MOCK_USER = {
  id: 'mock-user-id-demo',
  email: 'admin@demo.com',
};
const MOCK_ACCESS_TOKEN = 'mock-access-token-demo';

export function useAuthSessionSync({
  setIsLoggedIn,
  setCurrentUserName,
  setCurrentUserEmail,
  cachedSessionRef,
}: UseAuthSessionSyncParams) {
  useEffect(() => {
    // Immediately set up a mock session and log in
    cachedSessionRef.current = { accessToken: MOCK_ACCESS_TOKEN, user: MOCK_USER };
    setCachedSession(MOCK_ACCESS_TOKEN, MOCK_USER);
    setCurrentUserName('Demo Admin');
    setCurrentUserEmail(MOCK_USER.email);
    setIsLoggedIn(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
