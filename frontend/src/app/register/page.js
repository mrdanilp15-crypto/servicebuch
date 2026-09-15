'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🚗</div>
        <h1 className="text-2xl font-bold">Konto erstellen</h1>
        <p className="text-gray-500 text-sm mt-1">Der erste registrierte Nutzer wird automatisch Admin.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 card">
        <div>
          <label className="label">Name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Wird erstellt…' : 'Registrieren'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Bereits registriert?{' '}
        <Link href="/login" className="text-brand-600 font-medium">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
