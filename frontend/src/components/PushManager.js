'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Steuert die Push-Benachrichtigungs-Anmeldung (TÜV, Ölwechsel, Service-
// Intervalle, km-Stand, Reifenwechsel). Zeigt sich nur, wenn der Browser
// Push unterstützt (kein iOS Safari im Browser-Tab, aber als installierte
// PWA funktioniert es dort ebenfalls).
export default function PushManager() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ok = 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(ok);
    if (ok) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub);
        })
        .catch(() => setSupported(false));
    }
  }, []);

  const subscribe = async () => {
    setBusy(true);
    setError('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.');

      const { publicKey } = await apiFetch('/push/public-key');
      if (!publicKey) throw new Error('Push ist serverseitig noch nicht konfiguriert (VAPID Keys fehlen).');

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await apiFetch('/push/subscribe', { method: 'POST', body: sub.toJSON() });
      setSubscribed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiFetch('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="font-medium text-sm">Push-Benachrichtigungen</p>
        <p className="text-xs text-gray-500">TÜV, Ölwechsel, Service & mehr</p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={busy}
        className={subscribed ? 'btn-secondary text-xs px-3 py-1.5' : 'btn-primary text-xs px-3 py-1.5'}
      >
        {subscribed ? 'Deaktivieren' : 'Aktivieren'}
      </button>
    </div>
  );
}
