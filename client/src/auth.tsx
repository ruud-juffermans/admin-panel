import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from './api/website';
import { ApiError, onUnauthorized } from './api/client';
import type { AuthUser } from './api/types';

// One account, configured in the server's .env. The session is an httpOnly
// cookie on this origin; the client only learns {name}. A 401 from any call
// drops back to the login page.
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auth
      .me()
      .then(({ user }) => setUser(user))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) return; // not signed in: show the login
        setError(err instanceof Error ? err.message : 'Could not reach the admin API.');
      })
      .finally(() => setLoading(false));
    return onUnauthorized(() => setUser(null));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { user } = await auth.login(username, password);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, error, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
