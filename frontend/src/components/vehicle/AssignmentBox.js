'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

// Fahrzeuge einem Benutzer zuweisen (Rolle: Owner/Editor/Viewer).
export default function AssignmentBox({ vehicleId }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    apiFetch('/users')
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);

  const assign = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await apiFetch(`/vehicles/${vehicleId}/assign`, { method: 'POST', body: { userId, role } });
      setOk('Zugewiesen.');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!users.length) return null;

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Fahrzeug zuweisen</h2>
      <form onSubmit={assign} className="space-y-2">
        <select className="input" required value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="" disabled>
            Benutzer wählen…
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="OWNER">Owner (voller Zugriff)</option>
          <option value="EDITOR">Editor (bearbeiten)</option>
          <option value="VIEWER">Viewer (nur ansehen)</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {ok && <p className="text-sm text-green-600">{ok}</p>}
        <button type="submit" className="btn-secondary w-full">
          Zuweisen
        </button>
      </form>
    </div>
  );
}
