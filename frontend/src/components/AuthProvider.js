'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);

const PUBLIC_PATHS = ['/login', '/register'];

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
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!user && !isPublic) router.replace('/login');
    if (user && isPublic) router.replace('/dashboard');
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

  const logout = () => {
    localStorage.removeItem('sb_token');
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  return ctx;
}
