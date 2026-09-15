'use client';

import { useEffect, useRef, useState } from 'react';
import LineChart from '../LineChart';
import { apiFetch, API_URL, getToken } from '../../lib/api';

export default function MileageTab({ vehicle }) {
  const [entries, setEntries] = useState([]);
  const [mileage, setMileage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoMileage, setPhotoMileage] = useState('');
  const fileRef = useRef(null);

  const load = () =>
    apiFetch(`/vehicles/${vehicle.id}/mileage`)
      .then(setEntries)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const addManual = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/vehicles/${vehicle.id}/mileage`, { method: 'POST', body: { mileage: Number(mileage) } });
      setMileage('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadPhoto = async (file) => {
    if (!photoMileage) {
      setError('Bitte zuerst den abgelesenen Kilometerstand eingeben.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('mileage', photoMileage);
      const token = getToken();
      const res = await fetch(`${API_URL}/vehicles/${vehicle.id}/mileage/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload fehlgeschlagen.');
      setPhotoMileage('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const points = entries.map((e) => ({
    x: new Date(e.date).getTime(),
    y: e.mileage,
    label: new Date(e.date).toLocaleDateString('de-DE'),
  }));

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-semibold mb-2">Kilometerstand-Verlauf</h2>
        <LineChart points={points} formatY={(y) => `${y.toLocaleString('de-DE')} km`} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Manuelle Eingabe</h2>
        <form onSubmit={addManual} className="flex gap-2">
          <input
            className="input"
            type="number"
            placeholder="Kilometerstand"
            required
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Speichern
          </button>
        </form>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Foto vom Tacho</h2>
        <input
          className="input"
          type="number"
          placeholder="Abgelesener Kilometerstand"
          value={photoMileage}
          onChange={(e) => setPhotoMileage(e.target.value)}
        />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary w-full">
          {uploading ? 'Lädt…' : '📷 Foto aufnehmen / hochladen'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card">
        <h2 className="font-semibold mb-2">Verlauf</h2>
        <ul className="text-sm divide-y">
          {[...entries].reverse().map((e) => (
            <li key={e.id} className="flex justify-between py-1.5">
              <span className="text-gray-500">{new Date(e.date).toLocaleDateString('de-DE')}</span>
              <span className="font-medium">
                {e.mileage.toLocaleString('de-DE')} km {e.source === 'PHOTO' ? '📷' : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
