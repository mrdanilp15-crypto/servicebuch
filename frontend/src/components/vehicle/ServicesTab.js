'use client';

import { useEffect, useState } from 'react';
import { apiFetch, API_URL, getToken } from '../../lib/api';

const SERVICE_TYPES = ['Ölwechsel', 'Inspektion', 'TÜV / HU', 'Bremsen', 'Reifenwechsel', 'Reparatur', 'Sonstiges'];

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  mileage: '',
  type: SERVICE_TYPES[0],
  workshop: '',
  cost: '',
  notes: '',
  important: false,
  recurring: false,
  recurringIntervalMonths: '',
  recurringIntervalKm: '',
};

async function downloadPdf(url, filename) {
  const token = getToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}

export default function ServicesTab({ vehicle }) {
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch(`/vehicles/${vehicle.id}/services`).then(setServices).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const entry = await apiFetch(`/vehicles/${vehicle.id}/services`, {
        method: 'POST',
        body: {
          ...form,
          mileage: Number(form.mileage),
          cost: form.cost ? Number(form.cost) : 0,
          recurringIntervalMonths: form.recurringIntervalMonths ? Number(form.recurringIntervalMonths) : null,
          recurringIntervalKm: form.recurringIntervalKm ? Number(form.recurringIntervalKm) : null,
        },
      });

      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const token = getToken();
        await fetch(`${API_URL}/vehicles/${vehicle.id}/services/${entry.id}/attachments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      setForm(emptyForm);
      setFiles([]);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Diesen Service-Eintrag wirklich löschen?')) return;
    await apiFetch(`/vehicles/${vehicle.id}/services/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary flex-1">
          {showForm ? 'Abbrechen' : '+ Service-Eintrag'}
        </button>
        <button
          onClick={() =>
            downloadPdf(`${API_URL}/vehicles/${vehicle.id}/pdf`, `servicebuch-${vehicle.licensePlate}.pdf`)
          }
          className="btn-secondary"
        >
          📄 PDF
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Datum</label>
              <input
                className="input"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Kilometerstand</label>
              <input
                className="input"
                type="number"
                required
                value={form.mileage}
                onChange={(e) => setForm({ ...form, mileage: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Art des Service</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {SERVICE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Werkstatt</label>
              <input
                className="input"
                value={form.workshop}
                onChange={(e) => setForm({ ...form, workshop: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Kosten (€)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Notizen</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Rechnung (PDF) / Reparaturfotos</label>
            <input
              className="input"
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => setFiles([...e.target.files])}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.important}
              onChange={(e) => setForm({ ...form, important: e.target.checked })}
            />
            Als „Wichtig" markieren
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
            />
            Wiederkehrender Service
          </label>
          {form.recurring && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Intervall (Monate)</label>
                <input
                  className="input"
                  type="number"
                  value={form.recurringIntervalMonths}
                  onChange={(e) => setForm({ ...form, recurringIntervalMonths: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Intervall (km)</label>
                <input
                  className="input"
                  type="number"
                  value={form.recurringIntervalKm}
                  onChange={(e) => setForm({ ...form, recurringIntervalKm: e.target.value })}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Speichern…' : 'Eintrag speichern'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {services.map((s) => (
          <div key={s.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  {s.type} {s.important && <span className="text-red-600">⚠</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(s.date).toLocaleDateString('de-DE')} · {s.mileage.toLocaleString('de-DE')} km
                  {s.workshop ? ` · ${s.workshop}` : ''}
                </p>
              </div>
              <p className="font-semibold text-sm">{Number(s.cost || 0).toFixed(2)} €</p>
            </div>
            {s.notes && <p className="text-sm text-gray-600 mt-1">{s.notes}</p>}
            {s.attachments?.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">{s.attachments.length} Anhang/Anhänge</p>
            )}
            <div className="flex gap-3 mt-2 text-xs">
              <button
                onClick={() =>
                  downloadPdf(`${API_URL}/vehicles/${vehicle.id}/services/${s.id}/pdf`, `service-${s.id.slice(0, 8)}.pdf`)
                }
                className="text-brand-600"
              >
                PDF exportieren
              </button>
              <button onClick={() => remove(s.id)} className="text-red-600">
                Löschen
              </button>
            </div>
          </div>
        ))}
        {services.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Noch keine Einträge.</p>}
      </div>
    </div>
  );
}
