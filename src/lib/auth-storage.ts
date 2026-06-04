import type { AuthSession } from '@/lib/api-types';

const AUTH_STORAGE_KEY = 'hotel-yuvaan.auth';

export function getStoredSession(): AuthSession | null {
  try {
    const value = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return value ? (JSON.parse(value) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
