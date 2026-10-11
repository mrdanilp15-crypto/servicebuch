'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import PublicShell, { BrandHeader } from '../../components/PublicShell';
import { apiFetch } from '../../lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  // Der Registrieren-Link wird nur gezeigt, wenn die Registrierung offen ist
  // (nur beim allerersten Konto bzw. wenn der Betreiber sie freigegeben hat).
  useEffect(() => {
    apiFetch('/auth/status')
      .then((s) => setRegistrationOpen(!!s.registrationOpen))
      .catch(() => {});
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <BrandHeader title="Digitales Servicebuch" subtitle="Melde dich an, um fortzufahren." />

      <form onSubmit={onSubmit} className="card space-y-4 sm:p-6">
        <div>
          <label className="label" htmlFor="email">
            E-Mail
          </label>
          <input
            id="email"
            className="input"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Passwort
          </label>
          <input
            id="password"
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>

      {registrationOpen ? (
        <p className="mt-6 text-center text-sm text-gray-500">
          Noch kein Konto?{' '}
          <Link href="/register" className="text-brand-600 font-medium">
            Registrieren
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-center text-xs text-gray-400">
          Kein Konto? Neue Zugänge legt der Administrator dieser Instanz an.
        </p>
      )}
    </PublicShell>
  );
}
