import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { clearStoredSession, getStoredSession, storeSession } from '@/lib/auth-storage';
import type { AuthSession, CreateUserPayload, LoginPayload } from '@/lib/api-types';

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: CreateUserPayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());

  async function refreshProfile() {
    const profile = await api.profile();
    setSession((current) => {
      if (!current) return current;
      return storeSession({ ...current, ...profile, refreshToken: profile.refreshToken ?? current.refreshToken });
    });
  }

  useEffect(() => {
    if (session?.token) {
      void refreshProfile().catch(() => undefined);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      async login(payload) {
        const nextSession = await api.login(payload);
        setSession(storeSession(nextSession));
      },
      async register(payload) {
        const nextSession = await api.register(payload);
        setSession(storeSession(nextSession));
      },
      refreshProfile,
      logout() {
        clearStoredSession();
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
