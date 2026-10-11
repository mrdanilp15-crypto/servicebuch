'use client';

import { useEffect, useState } from 'react';
import Header from '../../../components/Header';
import Icon from '../../../components/Icon';
import { useAuth } from '../../../components/AuthProvider';
import { apiFetch } from '../../../lib/api';
import { fmtDate } from '../../../lib/format';

const emptyForm = { name: '', email: '', password: '', role: 'USER' };

// Zufälliges, gut tippbares Start-Passwort (ohne verwechselbare Zeichen).
function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = () =>
    apiFetch('/users')
      .then(setUsers)
      .catch((e) => setError(e.message));

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [user]);

  // Fehler/Hinweise der Aktionen einheitlich anzeigen.
  const run = async (fn, okMessage = '') => {
    setError('');
    setNotice('');
    try {
      await fn();
      if (okMessage) setNotice(okMessage);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setRole = (id, role) => run(() => apiFetch(`/users/${id}/role`, { method: 'PUT', body: { role } }));

  const remove = (u) => {
    if (
      !confirm(
        `${u.name} wirklich löschen? Fahrzeuge, die nur diese Person nutzt, werden mit allen Einträgen und Dateien entfernt.`
      )
    )
      return;
    run(() => apiFetch(`/users/${u.id}`, { method: 'DELETE' }), `${u.name} wurde gelöscht.`);
  };

  const resetPassword = (u) => {
    const password = generatePassword();
    if (!confirm(`Neues Passwort für ${u.name} setzen? Alle bestehenden Anmeldungen dieser Person werden beendet.`)) return;
    run(async () => {
      await apiFetch(`/users/${u.id}/password`, { method: 'PUT', body: { password } });
      setNotice(`Neues Passwort für ${u.name}: ${password}  – bitte sicher weitergeben und nach der Anmeldung ändern lassen.`);
    });
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await apiFetch('/users', { method: 'POST', body: form });
      setNotice(`Konto für ${form.name} angelegt. Gib das Start-Passwort sicher weiter.`);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
      <Header
        title="Benutzerverwaltung"
        actions={
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary flex items-center gap-1.5 !px-3 !py-2 text-sm">
            <Icon name="plus" className="h-4 w-4" />
            <span className="hidden sm:inline">{showForm ? 'Abbrechen' : 'Benutzer anlegen'}</span>
            <span className="sm:hidden">{showForm ? 'Abbrechen' : 'Neu'}</span>
          </button>
        }
      />
      <div className="space-y-4 p-4 md:max-w-3xl md:p-6 lg:p-8">
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="break-words rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            {notice}
          </p>
        )}

        {showForm && (
          <form onSubmit={create} className="card space-y-3">
            <h2 className="font-semibold">Neues Konto anlegen</h2>
            <p className="text-sm text-gray-500">
              Die Selbstregistrierung ist geschlossen – neue Personen bekommen hier ihren Zugang. Gib das Start-Passwort
              persönlich weiter; es lässt sich unter „Mein Konto“ ändern.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="nu-name">
                  Name
                </label>
                <input
                  id="nu-name"
                  className="input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="nu-email">
                  E-Mail
                </label>
                <input
                  id="nu-email"
                  className="input"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="nu-pw">
                  Start-Passwort
                </label>
                <div className="flex gap-2">
                  <input
                    id="nu-pw"
                    className="input font-mono"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="off"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, password: generatePassword() })}
                    className="btn-secondary shrink-0"
                    title="Zufälliges Passwort erzeugen"
                  >
                    <Icon name="key" className="h-5 w-5" />
                    <span className="sr-only">Passwort erzeugen</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="nu-role">
                  Rolle
                </label>
                <select
                  id="nu-role"
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="USER">Benutzer</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Anlegen…' : 'Konto anlegen'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {users.map((u) => {
            const self = u.id === user.id;
            return (
              <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {u.name}
                    {self && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">Du</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {u.email} · seit {fmtDate(u.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    aria-label={`Rolle von ${u.name}`}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value)}
                    disabled={self}
                  >
                    <option value="USER">Benutzer</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  <button
                    onClick={() => resetPassword(u)}
                    disabled={self}
                    className="text-sm text-brand-600 disabled:text-gray-300"
                  >
                    Passwort zurücksetzen
                  </button>
                  <button onClick={() => remove(u)} disabled={self} className="text-sm text-red-600 disabled:text-gray-300">
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400">
          Fahrzeuge werden auf der jeweiligen Fahrzeugseite (Tab „Übersicht“) einzelnen Benutzern zugewiesen. Das eigene
          Passwort änderst du unter „Mein Konto“.
        </p>
      </div>
    </div>
  );
}
