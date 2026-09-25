'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@resource-manager/types';
import { ApiError } from '@resource-manager/api-client';
import {
  clearSession,
  createBrowserApiClient,
  getStoredRefreshToken,
  getStoredUser,
  persistSession,
  refreshSession,
} from '@/lib/api';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(() => Boolean(getStoredUser()));

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      const stored = getStoredUser();
      if (!stored) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const client = createBrowserApiClient();
        const me = await client.me();
        if (cancelled) return;
        setUser(me);
        localStorage.setItem('rm_admin_user', JSON.stringify(me));
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          const refreshed = await refreshSession();
          if (cancelled) return;
          if (refreshed) {
            setUser(refreshed.user);
          } else {
            clearSession();
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const client = createBrowserApiClient();
    const tokens = await client.login({ email, password });
    persistSession(tokens);
    setUser(tokens.user);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    try {
      if (refreshToken) {
        const client = createBrowserApiClient();
        await client.logout({ refreshToken });
      }
    } catch {
      /* idempotent */
    } finally {
      clearSession();
      setUser(null);
      router.replace('/login');
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    const client = createBrowserApiClient();
    const me = await client.me();
    setUser(me);
    localStorage.setItem('rm_admin_user', JSON.stringify(me));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return ctx;
}
