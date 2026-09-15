'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import TagInput from '../../../components/TagInput';
import { apiFetch } from '../../../lib/api';

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    currentMileage: '',
    tags: [],
  });
  const [existingTags, setExistingTags] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/vehicles')
      .then((vehicles) => {
        const tags = new Set();
        vehicles.forEach((v) => v.tags.forEach((t) => tags.add(t)));
        setExistingTags([...tags]);
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const vehicle = await apiFetch('/vehicles', {
        method: 'POST',
        body: {
          ...form,
          year: form.year ? Number(form.year) : null,
          currentMileage: form.currentMileage ? Number(form.currentMileage) : 0,
        },
      });
      router.replace(`/vehicles/${vehicle.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Neues Fahrzeug" back />
      <form onSubmit={onSubmit} className="p-4 lg:p-8 lg:max-w-2xl space-y-4">
        <div className="card space-y-3">
          <div>
            <label className="label">Kennzeichen *</label>
            <input
              className="input"
              required
              value={form.licensePlate}
              onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Hersteller *</label>
              <input
                className="input"
                required
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Modell *</label>
              <input
                className="input"
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Baujahr</label>
              <input
                className="input"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Kilometerstand</label>
              <input
                className="input"
                type="number"
                value={form.currentMileage}
                onChange={(e) => setForm({ ...form, currentMileage: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">VIN / Fahrgestellnummer</label>
            <input className="input" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
          </div>
          <div>
            <label className="label">Tags</label>
            <p className="text-xs text-gray-400 mb-2">
              Frei wählbar, z. B. zur Einordnung nach Nutzung (Privat, Firma, Feuerwehr, Projekt …).
            </p>
            <TagInput
              value={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
              suggestions={existingTags}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Speichern…' : 'Fahrzeug anlegen'}
        </button>
      </form>
    </div>
  );
}
