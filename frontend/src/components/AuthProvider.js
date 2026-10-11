'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { clearImageCache } from './AuthImage';

const AuthContext = createContext(null);

// Ohne Anmeldung erreichbar. Impressum und Datenschutzerklärung müssen immer
// (auch ohne Login) abrufbar sein.
const PUBLIC_PATHS = ['/login', '/register', '/impressum', '/datenschutz'];
// Nur diese Seiten schicken bereits angemeldete Nutzer zum Dashboard.
const AUTH_ONLY_PATHS = ['/login', '/register'];

export const isPublicPath = (pathname) => PUBLIC_PATHS.includes(pathname);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token') : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('sb_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPath(pathname)) router.replace('/login');
    if (user && AUTH_ONLY_PATHS.includes(pathname)) router.replace('/dashboard');
  }, [user, loading, pathname, router]);

  const login = async (email, password) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('sb_token', data.token);
    setUser(data.user);
  };

  const register = async (name, email, password) => {
    const data = await apiFetch('/auth/register', { method: 'POST', body: { name, email, password } });
    localStorage.setItem('sb_token', data.token);
    setUser(data.user);
  };

  const logout = useCallback(() => {
    clearImageCache();
    localStorage.removeItem('sb_token');
    setUser(null);
    router.replace('/login');
  }, [router]);

  // Token abgelaufen/ungültig (z.B. Passwort auf anderem Gerät geändert):
  // apiFetch meldet das per Event - dann sauber abmelden statt lauter
  // Fehlermeldungen anzuzeigen.
  useEffect(() => {
    window.addEventListener('sb-unauthorized', logout);
    return () => window.removeEventListener('sb-unauthorized', logout);
  }, [logout]);

  // Nach Passwortänderung: neues Token übernehmen.
  const replaceToken = (token, nextUser) => {
    localStorage.setItem('sb_token', token);
    if (nextUser) setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, replaceToken, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  return ctx;
}
