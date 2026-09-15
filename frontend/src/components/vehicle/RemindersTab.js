'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

const TYPE_LABELS = {
  TUEV: 'TÜV / HU',
  OEL: 'Ölwechsel',
  SERVICE_INTERVAL: 'Service-Intervall',
  KM_INTERVAL: 'Kilometerstand-Intervall',
  REIFEN: 'Reifenwechsel',
  CUSTOM: 'Sonstige Erinnerung',
};

const emptyForm = { type: 'TUEV', label: '', dueDate: '', dueMileage: '' };

export default function RemindersTab({ vehicle }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    apiFetch(`/vehicles/${vehicle.id}/reminders`)
      .then(setRules)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/vehicles/${vehicle.id}/reminders`, {
        method: 'POST',
        body: {
          type: form.type,
          label: form.label || TYPE_LABELS[form.type],
          dueDate: form.dueDate || null,
          dueMileage: form.dueMileage ? Number(form.dueMileage) : null,
        },
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Erinnerung löschen?')) return;
    await apiFetch(`/vehicles/${vehicle.id}/reminders/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleActive = async (rule) => {
    await apiFetch(`/vehicles/${vehicle.id}/reminders/${rule.id}`, {
      method: 'PUT',
      body: { active: !rule.active },
    });
    load();
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm((s) => !s)} className="btn-primary w-full">
        {showForm ? 'Abbrechen' : '+ Erinnerung hinzufügen'}
      </button>

      {showForm && (
        <form onSubmit={submit} className="card space-y-3">
          <div>
            <label className="label">Typ</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <input
              className="input"
              placeholder={TYPE_LABELS[form.type]}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fälliges Datum</label>
              <input
                className="input"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Fälliger km-Stand</label>
              <input
                className="input"
                type="number"
                value={form.dueMileage}
                onChange={(e) => setForm({ ...form, dueMileage: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">Mindestens ein Fälligkeitskriterium (Datum oder km) angeben.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Speichern
          </button>
        </form>
      )}

      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className={`card flex items-center justify-between ${!r.active ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-medium">{r.label}</p>
              <p className="text-xs text-gray-500">
                {TYPE_LABELS[r.type]}
                {r.dueDate ? ` · fällig ${new Date(r.dueDate).toLocaleDateString('de-DE')}` : ''}
                {r.dueMileage ? ` · ${r.dueMileage.toLocaleString('de-DE')} km` : ''}
              </p>
            </div>
            <div className="flex gap-3 text-xs shrink-0">
              <button onClick={() => toggleActive(r)} className="text-brand-600">
                {r.active ? 'Pausieren' : 'Aktivieren'}
              </button>
              <button onClick={() => remove(r.id)} className="text-red-600">
                Löschen
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Keine Erinnerungen angelegt.</p>}
      </div>
    </div>
  );
}
