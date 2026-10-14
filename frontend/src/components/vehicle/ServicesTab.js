'use client';

import { useEffect, useState } from 'react';
import { AttachmentList, ImageThumb, openAttachmentFile } from '../AttachmentViewer';
import Icon from '../Icon';
import { useAuth } from '../AuthProvider';
import { apiFetch, downloadFile } from '../../lib/api';
import { fmtDate, fmtKm, fmtMoney } from '../../lib/format';

const SERVICE_TYPES = ['Ölwechsel', 'Inspektion', 'TÜV / HU', 'Bremsen', 'Reifenwechsel', 'Reparatur', 'Sonstiges'];
const CUSTOM_TYPE_OPTION = '__custom__';

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
  notify: true,
};

export default function ServicesTab({ vehicle, canEdit = true, onVehicleChange }) {
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [useCustomType, setUseCustomType] = useState(false);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  // Wie viele andere Personen (außer mir) Zugriff auf das Fahrzeug haben.
  const { user } = useAuth();
  const otherPeople = (vehicle.assignments || []).filter((a) => a.userId !== user?.id).length;
  const [pdfBusy, setPdfBusy] = useState('');
  const [pdfImages, setPdfImages] = useState(true);

  const load = () =>
    apiFetch(`/vehicles/${vehicle.id}/services`)
      .then(setServices)
      .catch((e) => setError(e.message))
      // Service-Einträge können den Kilometerstand des Fahrzeugs ändern.
      .finally(() => onVehicleChange?.());

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setUseCustomType(false);
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
    setUseCustomType(!SERVICE_TYPES.includes(s.type));
    setExistingAttachments(s.attachments || []);
    setFiles([]);
    setError('');
    setShowForm(true);
  };

  // Lädt ein PDF (ganzes Servicebuch oder einzelner Eintrag) und zeigt
  // Fehler an, statt dass bei einem Problem einfach nichts passiert.
  const exportPdf = async (key, path) => {
    setPdfBusy(key);
    setError('');
    try {
      await downloadFile(`${path}${pdfImages ? '' : '?images=false'}`, 'servicebuch.pdf');
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfBusy('');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setUseCustomType(false);
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

      // Der Eintrag selbst ist gespeichert; schlägt ein Datei-Upload fehl
      // (zu groß, falscher Typ), wird das gemeldet statt es zu verschlucken.
      const failed = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        try {
          await apiFetch(`/vehicles/${vehicle.id}/services/${entry.id}/attachments`, {
            method: 'POST',
            body: fd,
            isForm: true,
          });
        } catch (err) {
          failed.push(`${file.name}: ${err.message}`);
        }
      }

      load();
      if (failed.length) {
        setEditingId(entry.id);
        setFiles([]);
        setError(`Eintrag gespeichert, aber nicht alle Dateien konnten hochgeladen werden: ${failed.join(' | ')}`);
        const refreshed = await apiFetch(`/vehicles/${vehicle.id}/services/${entry.id}`).catch(() => null);
        setExistingAttachments(refreshed?.attachments || []);
      } else {
        closeForm();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = async (attachmentId) => {
    if (!confirm('Diesen Anhang wirklich löschen?')) return;
    try {
      await apiFetch(`/attachments/${attachmentId}`, { method: 'DELETE' });
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Diesen Service-Eintrag wirklich löschen?')) return;
    try {
      await apiFetch(`/vehicles/${vehicle.id}/services/${id}`, { method: 'DELETE' });
      if (editingId === id) closeForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <button onClick={() => (showForm ? closeForm() : openCreate())} className="btn-primary flex-1 whitespace-nowrap md:flex-none md:px-8">
            {showForm ? 'Abbrechen' : '+ Service-Eintrag'}
          </button>
        )}
        <button
          onClick={() => exportPdf('all', `/vehicles/${vehicle.id}/pdf`)}
          disabled={pdfBusy === 'all'}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Icon name="document" className="h-5 w-5" />
          {pdfBusy === 'all' ? 'Wird erstellt…' : (<><span className="sm:hidden">PDF</span><span className="hidden sm:inline">Servicebuch als PDF</span></>)}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" checked={pdfImages} onChange={(e) => setPdfImages(e.target.checked)} />
          mit Fotos
        </label>
      </div>
      {!showForm && error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={submit} className="card space-y-3 md:max-w-2xl">
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
                inputMode="numeric"
                placeholder={`aktuell ${vehicle.currentMileage}`}
                required
                value={form.mileage}
                onChange={(e) => setForm({ ...form, mileage: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Art des Service</label>
            <select
              className="input"
              value={useCustomType ? CUSTOM_TYPE_OPTION : form.type}
              onChange={(e) => {
                if (e.target.value === CUSTOM_TYPE_OPTION) {
                  setUseCustomType(true);
                  setForm({ ...form, type: '' });
                } else {
                  setUseCustomType(false);
                  setForm({ ...form, type: e.target.value });
                }
              }}
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value={CUSTOM_TYPE_OPTION}>Andere (eigene Eingabe)…</option>
            </select>
            {useCustomType && (
              <input
                className="input mt-2"
                required
                autoFocus
                placeholder="Art des Service eingeben"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            )}
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
                      <ImageThumb attachmentId={a.id} name={a.originalName} className="h-full w-full" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => openAttachmentFile(a.id)}
                        className="flex h-full w-full items-center justify-center rounded-lg bg-gray-100 p-1 text-center text-xs text-gray-600 hover:bg-gray-200"
                      >
                        {a.originalName || 'Datei'}
                      </button>
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

          {!editingId && otherPeople > 0 && (
            <label className="flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.notify}
                onChange={(e) => setForm({ ...form, notify: e.target.checked })}
              />
              <span>
                {otherPeople === 1 ? 'Die andere zugeordnete Person' : `Die ${otherPeople} anderen zugeordneten Personen`}{' '}
                benachrichtigen („Hurra, Service erledigt!“)
              </span>
            </label>
          )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((s) => (
          <div key={s.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {s.type}
                  {s.important && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                      <Icon name="warning" className="h-3 w-3" />
                      Wichtig
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {fmtDate(s.date)} · {fmtKm(s.mileage)}
                  {s.workshop ? ` · ${s.workshop}` : ''}
                </p>
              </div>
              <p className="shrink-0 pl-3 text-sm font-semibold">{fmtMoney(s.cost)}</p>
            </div>
            {s.notes && <p className="text-sm text-gray-600 mt-1">{s.notes}</p>}
            <AttachmentList attachments={s.attachments} />
            <div className="flex gap-3 mt-2 text-xs">
              {canEdit && (
                <button onClick={() => openEdit(s)} className="text-brand-600">
                  Bearbeiten
                </button>
              )}
              <button
                onClick={() => exportPdf(s.id, `/vehicles/${vehicle.id}/services/${s.id}/pdf`)}
                disabled={pdfBusy === s.id}
                className="text-brand-600"
              >
                {pdfBusy === s.id ? 'Wird erstellt…' : 'PDF exportieren'}
              </button>
              {canEdit && (
                <button onClick={() => remove(s.id)} className="text-red-600">
                  Löschen
                </button>
              )}
            </div>
          </div>
        ))}
        {services.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Noch keine Einträge.</p>}
      </div>
    </div>
  );
}
