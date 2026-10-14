'use client';

import { useRef, useState } from 'react';
import AuthImage from '../AuthImage';
import AssignmentBox from './AssignmentBox';
import Icon from '../Icon';
import TagInput from '../TagInput';
import { apiFetch } from '../../lib/api';
import { fmtKm } from '../../lib/format';

export default function OverviewTab({ vehicle, onChange, canEdit = true, isOwner = true }) {
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
    currentMileage: vehicle.currentMileage,
    tags: vehicle.tags,
  });

  const uploadHeader = async (file) => {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const data = await apiFetch(`/vehicles/${vehicle.id}/uploads/header`, { method: 'POST', body: fd, isForm: true });
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
        body: {
          ...form,
          year: form.year ? Number(form.year) : null,
          currentMileage: form.currentMileage === '' ? undefined : Number(form.currentMileage),
        },
      });
      onChange({ ...vehicle, ...updated });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const assignmentBox = (
    <AssignmentBox
      vehicleId={vehicle.id}
      assignments={vehicle.assignments}
      onChange={onChange}
      canManage={isOwner}
    />
  );

  return (
    <div className="space-y-4 md:grid md:grid-cols-5 md:gap-6 md:space-y-0 md:items-start">
      <div className="md:col-span-2 space-y-4">
        <div className="relative">
          <AuthImage attachmentId={vehicle.headerImage} className="w-full h-48 md:h-56 lg:h-64 object-cover rounded-2xl" />
          {canEdit && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium shadow"
              >
                <Icon name="camera" className="h-4 w-4" />
                {uploading ? 'Lädt…' : 'Bild ändern'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files[0] && uploadHeader(e.target.files[0])}
              />
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="hidden md:block">{assignmentBox}</div>
      </div>

      <div className="card space-y-3 md:col-span-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Fahrzeugdaten</h2>
          {canEdit && (
            <button onClick={() => setEditing((e) => !e)} className="text-sm text-brand-600">
              {editing ? 'Abbrechen' : 'Bearbeiten'}
            </button>
          )}
        </div>

        {!editing ? (
          <dl className="text-sm space-y-1.5">
            <Row label="Kennzeichen" value={vehicle.licensePlate} />
            <Row label="Hersteller" value={vehicle.make} />
            <Row label="Modell" value={vehicle.model} />
            <Row label="Baujahr" value={vehicle.year || '-'} />
            <Row label="FIN / VIN" value={vehicle.vin || '-'} />
            <Row label="Kilometerstand" value={fmtKm(vehicle.currentMileage)} />
            <div className="flex gap-1 pt-1 flex-wrap">
              {vehicle.tags.map((t) => (
                <span key={t} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
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
            <Field label="FIN / VIN" value={form.vin} onChange={(v) => setForm({ ...form, vin: v })} />
            <div>
              <Field
                label="Aktueller Kilometerstand"
                type="number"
                value={form.currentMileage}
                onChange={(v) => setForm({ ...form, currentMileage: v })}
              />
              <p className="mt-1 text-xs text-gray-400">
                Eine Änderung wird als neuer Eintrag im Kilometer-Verlauf gespeichert.
              </p>
            </div>
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

      <div className="md:hidden">{assignmentBox}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 text-right break-all">{value}</dd>
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
