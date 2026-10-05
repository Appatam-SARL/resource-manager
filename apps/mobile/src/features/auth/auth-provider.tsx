import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@resource-manager/types';
import { authApi, setUnauthorizedHandler } from '@/api/client';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/auth-storage';
import { AppError, mapApiError } from '@/lib/errors';
import { unregisterDevicePushToken } from '@/lib/notifications';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    // Needs a valid access token, so it runs before the session is revoked.
    await unregisterDevicePushToken();
    const refreshToken = await getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout({ refreshToken });
      }
    } catch {
      /* idempotent */
    } finally {
      await clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const access = await getAccessToken();
        if (!access) {
          if (!cancelled) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        try {
          const me = await authApi.me();
          if (!cancelled) setUser(me);
        } catch (error) {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            await clearTokens();
            if (!cancelled) setUser(null);
            return;
          }
          try {
            const tokens = await authApi.refresh({ refreshToken });
            await setTokens(tokens.accessToken, tokens.refreshToken);
            if (!cancelled) setUser(tokens.user);
          } catch {
            await clearTokens();
            if (!cancelled) setUser(null);
            void error;
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const tokens = await authApi.login({ email, password });
      await setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(tokens.user);
    } catch (error) {
      throw mapApiError(error);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
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

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    if (error.status === 401) return 'Email ou mot de passe incorrect.';
    return error.message;
  }
  return 'Impossible de se connecter. Réessayez.';
}
