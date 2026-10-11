'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

const ROLE_LABELS = {
  OWNER: 'Besitzer',
  EDITOR: 'Bearbeiter',
  VIEWER: 'Betrachter',
};

const ROLE_HELP = {
  OWNER: 'Besitzer – voller Zugriff',
  EDITOR: 'Bearbeiter – darf ändern',
  VIEWER: 'Betrachter – nur ansehen',
};

// Zeigt, wer Zugriff auf das Fahrzeug hat (mit Rolle). Besitzer (und Admins)
// können außerdem Zugriff vergeben, ändern und entfernen; alle anderen sehen
// nur die Liste. Wählt man einen bereits zugewiesenen Benutzer erneut aus,
// wird dessen Rolle aktualisiert statt eine zweite (doppelte) Zuweisung
// anzulegen - das verhindert auch das Backend (Upsert auf userId+vehicleId).
export default function AssignmentBox({ vehicleId, assignments = [], onChange, canManage = false }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    apiFetch('/users')
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, [canManage]);

  const existingFor = (uid) => assignments.find((a) => a.userId === uid);

  const refresh = async () => {
    const updated = await apiFetch(`/vehicles/${vehicleId}`);
    onChange?.(updated);
  };

  const onSelectUser = (uid) => {
    setUserId(uid);
    const existing = existingFor(uid);
    if (existing) setRole(existing.role);
  };

  const assign = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiFetch(`/vehicles/${vehicleId}/assign`, { method: 'POST', body: { userId, role } });
      setUserId('');
      setRole('VIEWER');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (uid) => {
    if (!confirm('Zugriff wirklich entfernen?')) return;
    setError('');
    try {
      await apiFetch(`/vehicles/${vehicleId}/assign/${uid}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedExisting = userId ? existingFor(userId) : null;

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Zugriff auf dieses Fahrzeug</h2>

      {assignments.length > 0 ? (
        <ul className="space-y-1.5">
          {assignments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-medium">{a.user?.name || 'Unbekannt'}</p>
                <p className="truncate text-xs text-gray-500">{a.user?.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                  {ROLE_LABELS[a.role] || a.role}
                </span>
                {canManage && (
                  <button onClick={() => remove(a.userId)} className="text-xs text-red-600">
                    Entfernen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Noch niemandem zugewiesen.</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {canManage && users.length > 0 && (
        <form onSubmit={assign} className="space-y-2 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">Weitere Person hinzufügen oder Rolle ändern:</p>
          <p className="text-[11px] leading-snug text-gray-400">
            Besitzer: alles inkl. Zugriff vergeben und Fahrzeug löschen. Bearbeiter: Einträge anlegen und ändern.
            Betrachter: ansehen und PDF exportieren.
          </p>
          <select
            className="input"
            required
            aria-label="Benutzer"
            value={userId}
            onChange={(e) => onSelectUser(e.target.value)}
          >
            <option value="" disabled>
              Benutzer wählen…
            </option>
            {users.map((u) => {
              const existing = existingFor(u.id);
              return (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                  {existing ? ` – bereits: ${ROLE_LABELS[existing.role]}` : ''}
                </option>
              );
            })}
          </select>
          <select className="input" aria-label="Rolle" value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(ROLE_HELP).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy} className="btn-secondary w-full">
            {busy ? 'Speichern…' : selectedExisting ? 'Rolle aktualisieren' : 'Zugriff geben'}
          </button>
        </form>
      )}
    </div>
  );
}
