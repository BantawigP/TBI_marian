/**
 * Module-level session cache.
 *
 * When the device clock is skewed, supabase.auth.getSession() and
 * refreshSession() both return null/error because the SDK sees the JWT as
 * "issued in the future". However, inside onAuthStateChange the SDK hands us
 * the session directly before discarding it.
 *
 * App.tsx writes here every time a valid session arrives; any service that
 * needs an access token (e.g. grantAccess in teamService.ts) reads from here
 * as a fallback, completely bypassing clock-sensitive SDK calls.
 */

interface CachedSession {
  accessToken: string;
  user: { id: string; email?: string | null };
  storedAt: number; // Date.now() – for optional staleness checks
}

let _cache: CachedSession | null = null;

export function setCachedSession(accessToken: string, user: { id: string; email?: string | null }) {
  _cache = { accessToken, user, storedAt: Date.now() };
}

export function clearCachedSession() {
  _cache = null;
}

export function getCachedSessionToken(): string | null {
  return _cache?.accessToken ?? null;
}

export function getCachedSession(): CachedSession | null {
  return _cache;
}
