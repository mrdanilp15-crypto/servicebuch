'use client';

import { useEffect, useRef, useState } from 'react';
import LineChart from '../LineChart';
import Icon from '../Icon';
import { ImageThumb } from '../AttachmentViewer';
import { apiFetch } from '../../lib/api';
import { fmtDate, fmtKm } from '../../lib/format';

const today = () => new Date().toISOString().slice(0, 10);

const SOURCE_LABEL = {
  INITIAL: 'Startwert beim Anlegen',
  SERVICE_ENTRY: 'aus Service-Eintrag',
  PHOTO: 'Tacho-Foto',
  MANUAL: '',
};

// onVehicleChange: lädt das Fahrzeug neu, damit der angezeigte aktuelle
// Kilometerstand (und alles, was davon abhängt, z.B. neue Erinnerungen) nach
// jeder Änderung sofort stimmt.
export default function MileageTab({ vehicle, canEdit = true, onVehicleChange }) {
  const [entries, setEntries] = useState([]);
  const [mileage, setMileage] = useState('');
  const [date, setDate] = useState(today());
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoMileage, setPhotoMileage] = useState('');
  const [photoDate, setPhotoDate] = useState(today());
  const [editing, setEditing] = useState(null); // { id, mileage, date }
  const fileRef = useRef(null);

  const load = async () => {
    try {
      setEntries(await apiFetch(`/vehicles/${vehicle.id}/mileage`));
    } catch (e) {
      setError(e.message);
    }
    onVehicleChange?.();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addManual = (e) => {
    e.preventDefault();
    run(async () => {
      await apiFetch(`/vehicles/${vehicle.id}/mileage`, {
        method: 'POST',
        body: { mileage: Number(mileage), date },
      });
      setMileage('');
    });
  };

  const uploadPhoto = async (file) => {
    if (!photoMileage) {
      setError('Bitte zuerst den am Tacho abgelesenen Kilometerstand eingeben.');
      return;
    }
    setUploading(true);
    await run(async () => {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('mileage', photoMileage);
      fd.append('date', photoDate);
      await apiFetch(`/vehicles/${vehicle.id}/mileage/photo`, { method: 'POST', body: fd, isForm: true });
      setPhotoMileage('');
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const saveEdit = (e) => {
    e.preventDefault();
    run(async () => {
      await apiFetch(`/vehicles/${vehicle.id}/mileage/${editing.id}`, {
        method: 'PUT',
        body: { mileage: Number(editing.mileage), date: editing.date },
      });
      setEditing(null);
    });
  };

  const remove = (entry) => {
    if (!confirm(`Kilometerstand ${fmtKm(entry.mileage)} vom ${fmtDate(entry.date)} löschen?`)) return;
    run(() => apiFetch(`/vehicles/${vehicle.id}/mileage/${entry.id}`, { method: 'DELETE' }));
  };

  const points = entries.map((e) => ({
    x: new Date(e.date).getTime(),
    y: e.mileage,
    label: fmtDate(e.date),
  }));

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Aktueller Kilometerstand</p>
          <p className="whitespace-nowrap text-3xl font-bold">{fmtKm(vehicle.currentMileage)}</p>
        </div>
        <p className="text-xs text-gray-400 sm:max-w-[14rem] sm:text-right">
          Es gilt immer der Stand des zuletzt datierten Eintrags – ein genauerer Wert überschreibt also einen
          geschätzten.
        </p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-2">Kilometerstand-Verlauf</h2>
        <LineChart points={points} formatY={(y) => fmtKm(y)} zeroBased={false} />
      </div>

      {canEdit && (
        <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
          <div className="card space-y-3">
            <h2 className="font-semibold">Stand eintragen</h2>
            <form onSubmit={addManual} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="km-value">
                    Kilometerstand
                  </label>
                  <input
                    id="km-value"
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    autoComplete="off"
                    placeholder={String(vehicle.currentMileage)}
                    required
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="km-date">
                    Datum
                  </label>
                  <input
                    id="km-date"
                    className="input"
                    type="date"
                    required
                    max={today()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                Speichern
              </button>
            </form>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Foto vom Tacho</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="km-photo-value">
                  Abgelesener Stand
                </label>
                <input
                  id="km-photo-value"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  autoComplete="off"
                  value={photoMileage}
                  onChange={(e) => setPhotoMileage(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="km-photo-date">
                  Datum
                </label>
                <input
                  id="km-photo-date"
                  className="input"
                  type="date"
                  max={today()}
                  value={photoDate}
                  onChange={(e) => setPhotoDate(e.target.value)}
                />
              </div>
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary w-full">
              <span className="inline-flex items-center justify-center gap-2">
                <Icon name="camera" className="h-5 w-5" />
                {uploading ? 'Lädt…' : 'Foto aufnehmen / hochladen'}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])}
            />
            <p className="text-xs text-gray-400">
              Das Foto wird verschlüsselt gespeichert und im Verlauf unten als Beleg angezeigt.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="card">
        <h2 className="font-semibold mb-2">Verlauf</h2>
        <ul className="divide-y text-sm">
          {[...entries].reverse().map((e) =>
            editing?.id === e.id ? (
              <li key={e.id} className="py-2">
                <form onSubmit={saveEdit} className="flex flex-wrap items-end gap-2">
                  <input
                    aria-label="Datum"
                    className="input !w-auto"
                    type="date"
                    required
                    max={today()}
                    value={editing.date}
                    onChange={(ev) => setEditing({ ...editing, date: ev.target.value })}
                  />
                  <input
                    aria-label="Kilometerstand"
                    className="input !w-36"
                    type="number"
                    min="0"
                    required
                    value={editing.mileage}
                    onChange={(ev) => setEditing({ ...editing, mileage: ev.target.value })}
                  />
                  <button type="submit" className="btn-primary !py-2">
                    OK
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="btn-secondary !py-2">
                    Abbrechen
                  </button>
                </form>
              </li>
            ) : (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{fmtKm(e.mileage)}</p>
                  <p className="text-xs text-gray-500">
                    {fmtDate(e.date)}
                    {SOURCE_LABEL[e.source] ? ` · ${SOURCE_LABEL[e.source]}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {e.photoPath && (
                    <ImageThumb
                      attachmentId={e.photoPath}
                      name={`Tacho ${fmtKm(e.mileage)} – ${fmtDate(e.date)}`}
                      className="h-12 w-12"
                      label="Tacho-Foto ansehen"
                    />
                  )}
                  {canEdit && !e.serviceEntryId && (
                    <div className="flex gap-3 text-xs">
                      <button
                        onClick={() => setEditing({ id: e.id, mileage: e.mileage, date: e.date.slice(0, 10) })}
                        className="text-brand-600"
                      >
                        Ändern
                      </button>
                      <button onClick={() => remove(e)} className="text-red-600">
                        Löschen
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          )}
          {entries.length === 0 && <li className="py-4 text-center text-gray-400">Noch keine Einträge.</li>}
        </ul>
      </div>
    </div>
  );
}
