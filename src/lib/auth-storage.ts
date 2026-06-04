import type { AuthSession } from '@/lib/api-types';
import { hydrateSessionFromToken } from '@/lib/auth-token';

const AUTH_STORAGE_KEY = 'hotel-yuvaan.auth';

export function getStoredSession(): AuthSession | null {
  try {
    const value = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return value ? hydrateSessionFromToken(JSON.parse(value) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession): AuthSession {
  const hydrated = hydrateSessionFromToken(session);
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(hydrated));
  return hydrated;
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
