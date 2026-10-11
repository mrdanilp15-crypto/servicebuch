'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Icon from '../../components/Icon';
import PushManager from '../../components/PushManager';
import { useAuth } from '../../components/AuthProvider';
import { apiFetch, downloadFile } from '../../lib/api';

const ROLE_LABEL = { ADMIN: 'Administrator', USER: 'Benutzer' };

function Message({ ok, children }) {
  if (!children) return null;
  return (
    <p role={ok ? 'status' : 'alert'} className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>
      {children}
    </p>
  );
}

export default function AccountPage() {
  const { user, logout, replaceToken } = useAuth();

  const [pw, setPw] = useState({ current: '', next: '', repeat: '' });
  const [pwMsg, setPwMsg] = useState({ ok: false, text: '' });
  const [pwBusy, setPwBusy] = useState(false);

  const [exportMsg, setExportMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [delMsg, setDelMsg] = useState('');

  if (!user) return null;

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ ok: false, text: '' });
    if (pw.next !== pw.repeat) return setPwMsg({ ok: false, text: 'Die neuen Passwörter stimmen nicht überein.' });
    setPwBusy(true);
    try {
      const data = await apiFetch('/auth/password', {
        method: 'PUT',
        body: { currentPassword: pw.current, newPassword: pw.next },
      });
      // Alle anderen Geräte sind jetzt abgemeldet; dieses bekommt ein neues Token.
      replaceToken(data.token, data.user);
      setPw({ current: '', next: '', repeat: '' });
      setPwMsg({ ok: true, text: 'Passwort geändert. Auf allen anderen Geräten wurdest du abgemeldet.' });
    } catch (err) {
      setPwMsg({ ok: false, text: err.message });
    } finally {
      setPwBusy(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    setExportMsg('');
    try {
      await downloadFile('/auth/export', 'servicebuch-datenexport.json');
    } catch (err) {
      setExportMsg(err.message);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setDelMsg('');
    if (!confirm('Konto und alle zugehörigen Daten jetzt endgültig löschen?')) return;
    try {
      await apiFetch('/auth/me', { method: 'DELETE', body: { password: delPassword } });
      logout();
    } catch (err) {
      setDelMsg(err.message);
    }
  };

  return (
    <div>
      <Header title="Mein Konto" />
      <div className="space-y-4 p-4 lg:max-w-3xl lg:p-8 lg:space-y-6">
        <div className="card flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="user" className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{user.name}</p>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
            <p className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {ROLE_LABEL[user.role] || user.role}
            </p>
          </div>
          <button onClick={logout} className="btn-secondary hidden shrink-0 sm:block">
            Abmelden
          </button>
        </div>

        <PushManager />

        <form onSubmit={changePassword} className="card space-y-3">
          <h2 className="font-semibold">Passwort ändern</h2>
          <div>
            <label className="label" htmlFor="pw-current">
              Aktuelles Passwort
            </label>
            <input
              id="pw-current"
              className="input"
              type="password"
              required
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pw-next">
                Neues Passwort
              </label>
              <input
                id="pw-next"
                className="input"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="pw-repeat">
                Wiederholen
              </label>
              <input
                id="pw-repeat"
                className="input"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={pw.repeat}
                onChange={(e) => setPw({ ...pw, repeat: e.target.value })}
              />
            </div>
          </div>
          <Message ok={pwMsg.ok}>{pwMsg.text}</Message>
          <button type="submit" disabled={pwBusy} className="btn-primary">
            {pwBusy ? 'Speichern…' : 'Passwort ändern'}
          </button>
        </form>

        <div className="card space-y-3">
          <h2 className="font-semibold">Meine Daten</h2>
          <p className="text-sm text-gray-600">
            Lade alle zu deinem Konto gespeicherten Daten (Fahrzeuge, Service-Einträge, Kilometerstände, Erinnerungen,
            Benachrichtigungen) als maschinenlesbare Datei herunter. Hochgeladene Fotos und Rechnungen findest du im
            jeweiligen Fahrzeug.
          </p>
          <Message>{exportMsg}</Message>
          <button onClick={exportData} disabled={exporting} className="btn-secondary inline-flex items-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            {exporting ? 'Wird erstellt…' : 'Meine Daten exportieren'}
          </button>
        </div>

        <div className="card space-y-3 border-red-100">
          <h2 className="font-semibold text-red-700">Konto löschen</h2>
          {!deleting ? (
            <>
              <p className="text-sm text-gray-600">
                Löscht dein Konto sowie alle Fahrzeuge samt Einträgen und Dateien, die nur du genutzt hast.
                Fahrzeuge, auf die auch andere Zugriff haben, bleiben für diese erhalten. Das lässt sich nicht
                rückgängig machen.
              </p>
              <button onClick={() => setDeleting(true)} className="btn-secondary text-red-600">
                Konto löschen…
              </button>
            </>
          ) : (
            <form onSubmit={deleteAccount} className="space-y-3">
              <div>
                <label className="label" htmlFor="del-pw">
                  Zur Bestätigung dein Passwort
                </label>
                <input
                  id="del-pw"
                  className="input"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={delPassword}
                  onChange={(e) => setDelPassword(e.target.value)}
                />
              </div>
              <Message>{delMsg}</Message>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700">
                  Endgültig löschen
                </button>
                <button type="button" onClick={() => setDeleting(false)} className="btn-secondary">
                  Abbrechen
                </button>
              </div>
            </form>
          )}
        </div>

        <button onClick={logout} className="btn-secondary flex w-full items-center justify-center gap-2 sm:hidden">
          <Icon name="logout" className="h-4 w-4" />
          Abmelden
        </button>

        <p className="text-center text-xs text-gray-400 lg:text-left">
          <Link href="/impressum" className="hover:text-gray-600">
            Impressum
          </Link>
          {' · '}
          <Link href="/datenschutz" className="hover:text-gray-600">
            Datenschutz
          </Link>
        </p>
      </div>
    </div>
  );
}
