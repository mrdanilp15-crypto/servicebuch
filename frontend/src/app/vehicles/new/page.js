'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { apiFetch } from '../../../lib/api';

const TAG_OPTIONS = ['Privat', 'Firma', 'Feuerwehr', 'Projekt'];

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

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
      <form onSubmit={onSubmit} className="p-4 space-y-4">
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
            <div className="flex gap-2 flex-wrap">
              {TAG_OPTIONS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    form.tags.includes(tag) ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
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
