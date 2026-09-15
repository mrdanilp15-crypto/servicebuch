'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🚗</div>
        <h1 className="text-2xl font-bold">Digitales Servicebuch</h1>
        <p className="text-gray-500 text-sm mt-1">Melde dich an, um fortzufahren.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 card">
        <div>
          <label className="label">E-Mail</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">Passwort</label>
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Noch kein Konto?{' '}
        <Link href="/register" className="text-brand-600 font-medium">
          Registrieren
        </Link>
      </p>
    </div>
  );
}
