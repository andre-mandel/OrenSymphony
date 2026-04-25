import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from './api';

type AuthState =
  | { status: 'loading' }
  | { status: 'setup_required' }
  | { status: 'login_required' }
  | { status: 'authenticated' };

interface AuthContext {
  state: AuthState;
  setup: (password: string) => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const status = await api.get<{ setup_required: boolean }>('/api/auth/status');
      if (status.setup_required) {
        setState({ status: 'setup_required' });
        return;
      }
      try {
        await api.get('/api/auth/me');
        setState({ status: 'authenticated' });
      } catch {
        setState({ status: 'login_required' });
      }
    } catch {
      setState({ status: 'login_required' });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setup = useCallback(async (password: string) => {
    await api.post('/api/auth/setup', { password });
    setState({ status: 'authenticated' });
  }, []);

  const login = useCallback(async (password: string) => {
    try {
      await api.post('/api/auth/login', { password });
      setState({ status: 'authenticated' });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) throw new Error('Wrong password.');
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setState({ status: 'login_required' });
  }, []);

  return (
    <Ctx.Provider value={{ state, setup, login, logout, refresh }}>{children}</Ctx.Provider>
  );
}

export function useAuth(): AuthContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
}
