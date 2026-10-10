import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { http, onApiUnauthenticated } from '@/lib/api';
import type { PublicUser } from '@/lib/types';
import { ApiError } from '@/lib/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: PublicUser | null;
  status: AuthStatus;
  refresh: () => Promise<PublicUser | null>;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (name: string, email: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clear = useCallback(() => {
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const refresh = useCallback(async (): Promise<PublicUser | null> => {
    try {
      const res = await http.get<{ user: PublicUser }>('/api/auth/me');
      setUser(res.user);
      setStatus('authenticated');
      return res.user;
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'UNAUTHENTICATED' || err.code === 'FORBIDDEN')) {
        clear();
        return null;
      }
      throw err;
    }
  }, [clear]);

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch(() => {
        if (!cancelled) setStatus('unauthenticated');
      })
      .finally(() => {
        if (!cancelled) setStatus((s) => (s === 'loading' ? 'unauthenticated' : s));
      });
    const unsub = onApiUnauthenticated(() => clear());
    return () => {
      cancelled = true;
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<PublicUser> => {
    const res = await http.post<{ user: PublicUser }>('/api/auth/login', { email, password });
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<PublicUser> => {
    const res = await http.post<{ user: PublicUser }>('/api/auth/register', { name, email, password });
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await http.post<void>('/api/auth/logout');
    } finally {
      clear();
    }
  }, [clear]);

  const value = useMemo(
    () => ({ user, status, refresh, login, register, logout }),
    [user, status, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}