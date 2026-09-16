'use client';

import { useRef, useState } from 'react';
import AuthImage from '../AuthImage';
import AssignmentBox from './AssignmentBox';
import TagInput from '../TagInput';
import { apiFetch, API_URL, getToken } from '../../lib/api';

export default function OverviewTab({ vehicle, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    licensePlate: vehicle.licensePlate,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year || '',
    vin: vehicle.vin || '',
    tags: vehicle.tags,
  });

  const uploadHeader = async (file) => {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = getToken();
      const res = await fetch(`${API_URL}/vehicles/${vehicle.id}/uploads/header`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload fehlgeschlagen.');
      const data = await res.json();
      onChange({ ...vehicle, headerImage: data.attachmentId });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError('');
    try {
      const updated = await apiFetch(`/vehicles/${vehicle.id}`, {
        method: 'PUT',
        body: { ...form, year: form.year ? Number(form.year) : null },
      });
      onChange({ ...vehicle, ...updated });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0 lg:items-start">
      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <AuthImage attachmentId={vehicle.headerImage} className="w-full h-48 lg:h-64 object-cover rounded-2xl" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-3 right-3 bg-white/90 rounded-full px-3 py-1.5 text-sm font-medium shadow"
          >
            {uploading ? 'Lädt…' : '📷 Bild ändern'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files[0] && uploadHeader(e.target.files[0])}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="hidden lg:block">
          <AssignmentBox vehicleId={vehicle.id} assignments={vehicle.assignments} onChange={onChange} />
        </div>
      </div>

      <div className="card space-y-3 lg:col-span-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Fahrzeugdaten</h2>
          <button onClick={() => setEditing((e) => !e)} className="text-sm text-brand-600">
            {editing ? 'Abbrechen' : 'Bearbeiten'}
          </button>
        </div>

        {!editing ? (
          <dl className="text-sm space-y-1.5">
            <Row label="Kennzeichen" value={vehicle.licensePlate} />
            <Row label="Hersteller" value={vehicle.make} />
            <Row label="Modell" value={vehicle.model} />
            <Row label="Baujahr" value={vehicle.year || '-'} />
            <Row label="VIN" value={vehicle.vin || '-'} />
            <Row label="Kilometerstand" value={`${vehicle.currentMileage.toLocaleString('de-DE')} km`} />
            <div className="flex gap-1 pt-1 flex-wrap">
              {vehicle.tags.map((t) => (
                <span key={t} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          </dl>
        ) : (
          <div className="space-y-3">
            <Field label="Kennzeichen" value={form.licensePlate} onChange={(v) => setForm({ ...form, licensePlate: v })} />
            <Field label="Hersteller" value={form.make} onChange={(v) => setForm({ ...form, make: v })} />
            <Field label="Modell" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
            <Field label="Baujahr" value={form.year} onChange={(v) => setForm({ ...form, year: v })} type="number" />
            <Field label="VIN" value={form.vin} onChange={(v) => setForm({ ...form, vin: v })} />
            <div>
              <label className="label">Tags</label>
              <TagInput value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
            </div>
            <button onClick={save} className="btn-primary w-full">
              Speichern
            </button>
          </div>
        )}
      </div>

      <div className="lg:hidden">
        <AssignmentBox vehicleId={vehicle.id} assignments={vehicle.assignments} onChange={onChange} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800">{value}</dd>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
