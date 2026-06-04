import type { AuthSession, AuthTokenClaims } from '@/lib/api-types';

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return window.atob(padded);
}

export function decodeAuthToken(token: string): AuthTokenClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload)) as AuthTokenClaims;
  } catch {
    return null;
  }
}

export function hydrateSessionFromToken(session: AuthSession): AuthSession {
  const claims = decodeAuthToken(session.token);
  if (!claims) return session;

  return {
    ...session,
    uid: claims.uid,
    roles: claims.roles ?? [],
    perms: claims.perms ?? {},
  };
}
