'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

const TYPE_LABELS = {
  TUEV: 'TÜV / HU',
  OEL: 'Ölwechsel',
  SERVICE_INTERVAL: 'Inspektion / Service',
  KM_INTERVAL: 'Kilometerstand-Intervall',
  REIFEN: 'Reifenwechsel',
  BREMSEN: 'Bremsen',
  ZAHNRIEMEN: 'Zahnriemen',
  KLIMAANLAGE: 'Klimaanlage-Service',
  BATTERIE: 'Batterie',
  LUFTFILTER: 'Luftfilter',
  KUPPLUNG: 'Kupplung',
  CUSTOM: 'Sonstige Erinnerung',
};

const emptyForm = {
  type: 'OEL',
  label: '',
  mode: 'interval', // 'interval' = ab jetzt berechnen, 'fixed' = festes Datum/km
  intervalMonths: '',
  intervalKm: '',
  dueDate: '',
  dueMileage: '',
};

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

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

    let dueDate = form.dueDate || null;
    let dueMileage = form.dueMileage ? Number(form.dueMileage) : null;
    const intervalMonths = form.intervalMonths ? Number(form.intervalMonths) : null;
    const intervalKm = form.intervalKm ? Number(form.intervalKm) : null;

    if (form.mode === 'interval') {
      dueDate = intervalMonths ? addMonths(new Date(), intervalMonths) : null;
      dueMileage = intervalKm ? vehicle.currentMileage + intervalKm : null;
    }

    if (!dueDate && !dueMileage) {
      setError('Bitte mindestens ein Fälligkeitskriterium angeben (Intervall oder festes Datum/km).');
      return;
    }

    try {
      await apiFetch(`/vehicles/${vehicle.id}/reminders`, {
        method: 'POST',
        body: {
          type: form.type,
          label: form.label || TYPE_LABELS[form.type],
          dueDate,
          dueMileage,
          intervalMonths: form.mode === 'interval' ? intervalMonths : null,
          intervalKm: form.mode === 'interval' ? intervalKm : null,
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
      <button onClick={() => setShowForm((s) => !s)} className="btn-primary w-full lg:w-auto lg:max-w-2xl">
        {showForm ? 'Abbrechen' : '+ Erinnerung hinzufügen'}
      </button>

      {showForm && (
        <form onSubmit={submit} className="card space-y-3 lg:max-w-2xl">
          <div>
            <label className="label">Wofür?</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Beschreibung (optional)</label>
            <input
              className="input"
              placeholder={TYPE_LABELS[form.type]}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Fälligkeit</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'interval' })}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                  form.mode === 'interval' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Intervall ab jetzt
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'fixed' })}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                  form.mode === 'fixed' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Festes Datum / km
              </button>
            </div>

            {form.mode === 'interval' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Alle X Monate</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="z. B. 12"
                    value={form.intervalMonths}
                    onChange={(e) => setForm({ ...form, intervalMonths: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Alle X km</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="z. B. 15000"
                    value={form.intervalKm}
                    onChange={(e) => setForm({ ...form, intervalKm: e.target.value })}
                  />
                </div>
                <p className="col-span-2 text-xs text-gray-400">
                  Wird ab heute bzw. ab dem aktuellen Kilometerstand ({vehicle.currentMileage.toLocaleString('de-DE')} km)
                  berechnet.
                </p>
              </div>
            ) : (
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
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Speichern
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {rules.map((r) => (
          <div key={r.id} className={`card flex items-center justify-between ${!r.active ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-medium">{r.label}</p>
              <p className="text-xs text-gray-500">
                {TYPE_LABELS[r.type] || r.type}
                {r.dueDate ? ` · fällig ${new Date(r.dueDate).toLocaleDateString('de-DE')}` : ''}
                {r.dueMileage ? ` · ${r.dueMileage.toLocaleString('de-DE')} km` : ''}
              </p>
              {(r.intervalMonths || r.intervalKm) && (
                <p className="text-xs text-gray-400">
                  Intervall: {r.intervalMonths ? `alle ${r.intervalMonths} Monate` : ''}
                  {r.intervalMonths && r.intervalKm ? ' / ' : ''}
                  {r.intervalKm ? `alle ${r.intervalKm.toLocaleString('de-DE')} km` : ''}
                </p>
              )}
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
        {rules.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6 lg:col-span-2">Keine Erinnerungen angelegt.</p>
        )}
      </div>
    </div>
  );
}
