'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { apiFetch } from '../../lib/api';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const load = () =>
    apiFetch('/notifications')
      .then(setItems)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
    load();
  };

  const markAllRead = async () => {
    await apiFetch('/notifications/read-all', { method: 'POST' });
    load();
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      await apiFetch('/notifications/check', { method: 'POST' });
      load();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <Header title="Benachrichtigungen" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={markAllRead} className="btn-secondary flex-1 text-sm">
            Alle gelesen
          </button>
          <button onClick={runCheck} disabled={checking} className="btn-secondary flex-1 text-sm">
            {checking ? 'Prüfe…' : 'Jetzt prüfen'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {items.map((n) => (
          <div key={n.id} className={`card ${!n.read ? 'border-brand-200 bg-brand-50' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-gray-600">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('de-DE')}</p>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)} className="text-xs text-brand-600 shrink-0">
                  Gelesen
                </button>
              )}
            </div>
            {n.vehicle && (
              <Link href={`/vehicles/${n.vehicle.id}`} className="text-xs text-brand-600 underline">
                Fahrzeug ansehen
              </Link>
            )}
          </div>
        ))}

        {items.length === 0 && !error && (
          <p className="text-sm text-gray-400 text-center py-12">Keine Benachrichtigungen.</p>
        )}
      </div>
    </div>
  );
}
