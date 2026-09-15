'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import LineChart from '../../components/LineChart';
import PushManager from '../../components/PushManager';
import AuthImage from '../../components/AuthImage';
import { apiFetch } from '../../lib/api';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('de-DE') : '-';
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [costFilter, setCostFilter] = useState('all');

  const load = async () => {
    try {
      const d = await apiFetch('/dashboard');
      setData(d);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!data) return <p className="p-4 text-gray-500">Lade Dashboard…</p>;

  const selectedCost =
    costFilter === 'all'
      ? { costPerYear: data.costPerYear, currentYearCost: data.currentYearCost }
      : data.costPerYearByVehicle?.[costFilter] || { costPerYear: [], currentYearCost: 0 };

  const costPoints = selectedCost.costPerYear.map((c) => ({ x: c.year, y: c.cost, label: String(c.year) }));

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
        <PushManager />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="card text-center lg:py-6">
            <p className="text-2xl lg:text-4xl font-bold">{data.totalVehicles}</p>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">Fahrzeuge</p>
          </div>
          <div className="card text-center lg:py-6">
            <p className="text-2xl lg:text-4xl font-bold">{selectedCost.currentYearCost.toFixed(0)} €</p>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">
              Kosten dieses Jahr{costFilter !== 'all' ? ' (gefiltert)' : ''}
            </p>
          </div>
          <div className="card text-center lg:py-6">
            <p className="text-2xl lg:text-4xl font-bold">{data.dueServices.length}</p>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">Bald fällig</p>
          </div>
          <div className="card text-center lg:py-6">
            <p className={`text-2xl lg:text-4xl font-bold ${data.warnings.length > 0 ? 'text-red-600' : ''}`}>
              {data.warnings.length}
            </p>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">Überfällig</p>
          </div>
        </div>

        {data.warnings.length > 0 && (
          <div className="card border-red-200 bg-red-50">
            <h2 className="font-semibold text-red-700 mb-2">⚠ Überfällige Warnungen</h2>
            <p className="text-xs text-red-600/80 mb-2">
              Diese Termine sind bereits überschritten (Datum oder Kilometerstand liegt in der Vergangenheit).
            </p>
            <ul className="space-y-1">
              {data.warnings.map((w) => (
                <li key={w.ruleId} className="text-sm text-red-700">
                  <Link href={`/vehicles/${w.vehicleId}`} className="underline">
                    {w.vehicleLabel}
                  </Link>
                  : {w.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          <div className="card">
            <h2 className="font-semibold mb-1">Fällige Services</h2>
            <p className="text-xs text-gray-400 mb-2">Erinnerungen, die in den nächsten 30 Tagen bzw. 1.000 km fällig werden.</p>
            {data.dueServices.length === 0 && <p className="text-sm text-gray-400">Nichts fällig 🎉</p>}
            <ul className="space-y-2">
              {data.dueServices.map((s) => (
                <li key={s.ruleId} className="flex justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <Link href={`/vehicles/${s.vehicleId}`} className="font-medium text-gray-800 hover:text-brand-600">
                      {s.vehicleLabel}
                    </Link>
                    <p className="text-gray-500">{s.label}</p>
                  </div>
                  <div className="text-right text-gray-500 shrink-0 pl-3">
                    {s.dueDate && <p>{fmtDate(s.dueDate)}</p>}
                    {s.dueMileage && <p>{s.dueMileage.toLocaleString('de-DE')} km</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="font-semibold">Kosten pro Jahr</h2>
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 max-w-[55%]"
                value={costFilter}
                onChange={(e) => setCostFilter(e.target.value)}
              >
                <option value="all">Alle Fahrzeuge</option>
                {data.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.licensePlate})
                  </option>
                ))}
              </select>
            </div>
            <LineChart points={costPoints} formatY={(y) => `${y.toFixed(0)} €`} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Fahrzeuge</h2>
            <Link href="/vehicles" className="text-sm text-brand-600 font-medium">
              Alle ansehen
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.vehicles.map((v) => (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:border-brand-200 hover:bg-brand-50/40 transition"
              >
                <AuthImage attachmentId={v.headerImage} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {v.make} {v.model}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{v.licensePlate}</p>
                </div>
                <p className="text-xs text-gray-500 shrink-0">{v.currentMileage.toLocaleString('de-DE')} km</p>
              </Link>
            ))}
          </div>
          {data.vehicles.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              Noch keine Fahrzeuge.{' '}
              <Link href="/vehicles/new" className="text-brand-600 font-medium">
                Erstes Fahrzeug anlegen
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
