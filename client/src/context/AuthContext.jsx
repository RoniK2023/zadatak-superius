import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api.js';

const AuthContext = createContext(null);

export const HOME_BY_ROLE = {
  GUEST: '/gost',
  WAITER: '/konobar',
  OWNER: '/vlasnik',
  SUPERADMIN: '/admin',
};

export const ROLE_LABELS = {
  GUEST: 'Gost',
  WAITER: 'Konobar',
  OWNER: 'Vlasnik',
  SUPERADMIN: 'Superadmin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(tokenStore.get() ? 'loading' : 'anonymous');

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return null;
    try {
      const { user: me } = await api('/auth/me');
      setUser(me);
      setStatus('authenticated');
      return me;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    refresh();
  }, [refresh, logout]);

  const startSession = useCallback(
    async (token) => {
      tokenStore.set(token);
      return refresh();
    },
    [refresh],
  );

  const login = useCallback(
    async (email, password) => {
      const { token } = await api('/auth/login', { method: 'POST', body: { email, password } });
      return startSession(token);
    },
    [startSession],
  );

  const register = useCallback(
    async (payload) => {
      const { token } = await api('/auth/register', { method: 'POST', body: payload });
      return startSession(token);
    },
    [startSession],
  );

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
