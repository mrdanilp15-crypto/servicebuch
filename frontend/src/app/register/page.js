'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import PublicShell, { BrandHeader } from '../../components/PublicShell';
import { apiFetch } from '../../lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null); // null = wird geprüft

  useEffect(() => {
    apiFetch('/auth/status')
      .then((s) => setOpen(!!s.registrationOpen))
      .catch(() => setOpen(true)); // der Server entscheidet beim Absenden ohnehin
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (open === false) {
    return (
      <PublicShell>
        <BrandHeader title="Registrierung geschlossen" />
        <div className="card space-y-3 text-sm text-gray-600 sm:p-6">
          <p>
            Auf dieser Instanz kann man sich nicht selbst registrieren. Neue Konten legt der Administrator unter
            „Benutzerverwaltung“ an.
          </p>
          <Link href="/login" className="btn-primary block text-center">
            Zur Anmeldung
          </Link>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <BrandHeader title="Konto erstellen" subtitle="Der erste registrierte Nutzer wird automatisch Administrator." />

      <form onSubmit={onSubmit} className="card space-y-4 sm:p-6">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="input"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-Mail
          </label>
          <input
            id="email"
            className="input"
            type="email"
            required
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
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-gray-400">Mindestens 8 Zeichen.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading || open === null} className="btn-primary w-full">
          {loading ? 'Wird erstellt…' : 'Registrieren'}
        </button>
        <p className="text-xs text-gray-400">
          Mit der Registrierung bestätigst du, die{' '}
          <Link href="/datenschutz" className="underline" target="_blank">
            Datenschutzhinweise
          </Link>{' '}
          gelesen zu haben.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Bereits registriert?{' '}
        <Link href="/login" className="text-brand-600 font-medium">
          Anmelden
        </Link>
      </p>
    </PublicShell>
  );
}
