'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import LineChart from '../../components/LineChart';
import PushManager from '../../components/PushManager';
import { apiFetch } from '../../lib/api';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('de-DE') : '-';
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

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

  const costPoints = data.costPerYear.map((c) => ({ x: c.year, y: c.cost, label: String(c.year) }));

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 space-y-4">
        <PushManager />

        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-2xl font-bold">{data.totalVehicles}</p>
            <p className="text-xs text-gray-500">Fahrzeuge</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold">{data.currentYearCost.toFixed(0)} €</p>
            <p className="text-xs text-gray-500">Kosten dieses Jahr</p>
          </div>
        </div>

        {data.warnings.length > 0 && (
          <div className="card border-red-200 bg-red-50">
            <h2 className="font-semibold text-red-700 mb-2">⚠ Überfällige Warnungen</h2>
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

        <div className="card">
          <h2 className="font-semibold mb-2">Fällige Services</h2>
          {data.dueServices.length === 0 && <p className="text-sm text-gray-400">Nichts fällig 🎉</p>}
          <ul className="space-y-2">
            {data.dueServices.map((s) => (
              <li key={s.ruleId} className="flex justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <div>
                  <Link href={`/vehicles/${s.vehicleId}`} className="font-medium text-gray-800">
                    {s.vehicleLabel}
                  </Link>
                  <p className="text-gray-500">{s.label}</p>
                </div>
                <div className="text-right text-gray-500">
                  {s.dueDate && <p>{fmtDate(s.dueDate)}</p>}
                  {s.dueMileage && <p>{s.dueMileage.toLocaleString('de-DE')} km</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-2">Kosten pro Jahr</h2>
          <LineChart points={costPoints} formatY={(y) => `${y.toFixed(0)} €`} />
        </div>

        <div className="card">
          <h2 className="font-semibold mb-2">Fahrzeuge</h2>
          <div className="space-y-2">
            {data.vehicles.map((v) => (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2"
              >
                <div>
                  <p className="font-medium">
                    {v.make} {v.model}
                  </p>
                  <p className="text-xs text-gray-500">{v.licensePlate}</p>
                </div>
                <p className="text-sm text-gray-500">{v.currentMileage.toLocaleString('de-DE')} km</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
