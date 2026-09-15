'use client';

import { useEffect, useState } from 'react';
import AuthImage from '../AuthImage';
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
  const [editingId, setEditingId] = useState(null);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch(`/vehicles/${vehicle.id}/services`).then(setServices).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setExistingAttachments([]);
    setFiles([]);
    setError('');
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      date: s.date.slice(0, 10),
      mileage: s.mileage,
      type: s.type,
      workshop: s.workshop || '',
      cost: s.cost ?? '',
      notes: s.notes || '',
      important: s.important,
      recurring: s.recurring,
      recurringIntervalMonths: s.recurringIntervalMonths ?? '',
      recurringIntervalKm: s.recurringIntervalKm ?? '',
    });
    setExistingAttachments(s.attachments || []);
    setFiles([]);
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFiles([]);
    setExistingAttachments([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        mileage: Number(form.mileage),
        cost: form.cost ? Number(form.cost) : 0,
        recurringIntervalMonths: form.recurringIntervalMonths ? Number(form.recurringIntervalMonths) : null,
        recurringIntervalKm: form.recurringIntervalKm ? Number(form.recurringIntervalKm) : null,
      };

      const entry = editingId
        ? await apiFetch(`/vehicles/${vehicle.id}/services/${editingId}`, { method: 'PUT', body })
        : await apiFetch(`/vehicles/${vehicle.id}/services`, { method: 'POST', body });

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

      closeForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = async (attachmentId) => {
    if (!confirm('Diesen Anhang wirklich löschen?')) return;
    await apiFetch(`/attachments/${attachmentId}`, { method: 'DELETE' });
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const remove = async (id) => {
    if (!confirm('Diesen Service-Eintrag wirklich löschen?')) return;
    await apiFetch(`/vehicles/${vehicle.id}/services/${id}`, { method: 'DELETE' });
    if (editingId === id) closeForm();
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => (showForm ? closeForm() : openCreate())} className="btn-primary flex-1 lg:flex-none lg:px-8">
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
        <form onSubmit={submit} className="card space-y-3 lg:max-w-2xl">
          <h2 className="font-semibold">{editingId ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>
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
                autoComplete="off"
                required
                value={form.mileage}
                onChange={(e) => setForm({ ...form, mileage: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Art des Service</label>
            <input
              className="input"
              list="service-type-options"
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <datalist id="service-type-options">
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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

          {existingAttachments.length > 0 && (
            <div>
              <label className="label">Vorhandene Anhänge</label>
              <div className="grid grid-cols-3 gap-2">
                {existingAttachments.map((a) => (
                  <div key={a.id} className="relative aspect-square">
                    {a.mimeType?.startsWith('image/') ? (
                      <AuthImage attachmentId={a.id} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 text-center p-1">
                        {a.originalName || 'Datei'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs leading-5"
                      aria-label="Anhang löschen"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">{editingId ? 'Weitere Anhänge hinzufügen' : 'Rechnung (PDF) / Reparaturfotos'}</label>
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
                  autoComplete="off"
                  value={form.recurringIntervalMonths}
                  onChange={(e) => setForm({ ...form, recurringIntervalMonths: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Intervall (km)</label>
                <input
                  className="input"
                  type="number"
                  autoComplete="off"
                  value={form.recurringIntervalKm}
                  onChange={(e) => setForm({ ...form, recurringIntervalKm: e.target.value })}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Speichern…' : editingId ? 'Änderungen speichern' : 'Eintrag speichern'}
            </button>
            {editingId && (
              <button type="button" onClick={() => remove(editingId)} className="btn-secondary text-red-600">
                Löschen
              </button>
            )}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
              <button onClick={() => openEdit(s)} className="text-brand-600">
                Bearbeiten
              </button>
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
