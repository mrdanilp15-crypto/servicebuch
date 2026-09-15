'use client';

import { useEffect, useState } from 'react';
import Header from '../../../components/Header';
import { useAuth } from '../../../components/AuthProvider';
import { apiFetch } from '../../../lib/api';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const load = () =>
    apiFetch('/users')
      .then(setUsers)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const setRole = async (id, role) => {
    await apiFetch(`/users/${id}/role`, { method: 'PUT', body: { role } });
    load();
  };

  const remove = async (id) => {
    if (!confirm('Diesen Benutzer wirklich löschen?')) return;
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    load();
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <Header title="Verwaltung" />
        <p className="p-4 text-gray-500">Nur für Administratoren.</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="Benutzerverwaltung" />
      <div className="p-4 lg:p-8 lg:max-w-3xl space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {users.map((u) => (
          <div key={u.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                value={u.role}
                onChange={(e) => setRole(u.id, e.target.value)}
                disabled={u.id === user.id}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button onClick={() => remove(u.id)} disabled={u.id === user.id} className="text-red-600 text-sm">
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="px-4 lg:px-8 lg:max-w-3xl text-xs text-gray-400">
        Fahrzeuge werden auf der jeweiligen Fahrzeugseite (Tab „Übersicht") einzelnen Benutzern zugewiesen.
      </p>
    </div>
  );
}
