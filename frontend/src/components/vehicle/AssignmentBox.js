'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

const ROLE_LABELS = {
  OWNER: 'Owner (voller Zugriff)',
  EDITOR: 'Editor (bearbeiten)',
  VIEWER: 'Viewer (nur ansehen)',
};

// Zeigt, wer einem Fahrzeug bereits zugewiesen ist (mit Rolle + Entfernen-
// Button) und erlaubt, weitere Benutzer zuzuweisen. Wählt man einen
// bereits zugewiesenen Benutzer erneut aus, wird dessen Rolle aktualisiert
// statt eine zweite (doppelte) Zuweisung anzulegen - das verhindert auch
// das Backend (Upsert auf userId+vehicleId), aber die UI macht das jetzt
// sichtbar statt es zu verschleiern.
export default function AssignmentBox({ vehicleId, assignments = [], onChange }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch('/users')
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);

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
    if (!confirm('Zuweisung wirklich entfernen?')) return;
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
      <h2 className="font-semibold">Fahrzeug zuweisen</h2>

      {assignments.length > 0 ? (
        <ul className="space-y-1.5">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm rounded-lg bg-gray-50 px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.user?.name || 'Unbekannt'}</p>
                <p className="text-xs text-gray-500 truncate">{a.user?.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">
                  {a.role}
                </span>
                <button onClick={() => remove(a.userId)} className="text-red-600 text-xs">
                  Entfernen
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Noch niemandem zugewiesen.</p>
      )}

      {users.length > 0 && (
        <form onSubmit={assign} className="space-y-2 pt-1 border-t border-gray-100">
          <select className="input" required value={userId} onChange={(e) => onSelectUser(e.target.value)}>
            <option value="" disabled>
              Benutzer wählen…
            </option>
            {users.map((u) => {
              const existing = existingFor(u.id);
              return (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                  {existing ? ` — bereits: ${existing.role}` : ''}
                </option>
              );
            })}
          </select>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="btn-secondary w-full">
            {busy ? 'Speichern…' : selectedExisting ? 'Rolle aktualisieren' : 'Zuweisen'}
          </button>
        </form>
      )}
    </div>
  );
}
