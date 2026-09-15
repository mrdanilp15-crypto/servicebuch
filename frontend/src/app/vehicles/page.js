'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import AuthImage from '../../components/AuthImage';
import { apiFetch } from '../../lib/api';

const TAG_OPTIONS = ['Privat', 'Firma', 'Feuerwehr', 'Projekt'];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(null);

  useEffect(() => {
    apiFetch('/vehicles')
      .then(setVehicles)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = filter ? vehicles.filter((v) => v.tags.includes(filter)) : vehicles;

  return (
    <div>
      <Header title="Fahrzeuge" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              !filter ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            Alle
          </button>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                filter === t ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {filtered.map((v) => (
          <Link key={v.id} href={`/vehicles/${v.id}`} className="card flex gap-3 items-center">
            <AuthImage attachmentId={v.images?.[0]?.url} className="w-16 h-16 rounded-xl object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">
                {v.make} {v.model}
              </p>
              <p className="text-sm text-gray-500">{v.licensePlate}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {v.tags.map((t) => (
                  <span key={t} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 shrink-0">{v.currentMileage.toLocaleString('de-DE')} km</p>
          </Link>
        ))}

        {filtered.length === 0 && !error && (
          <div className="text-center text-gray-400 py-12">
            <p className="mb-3">Noch keine Fahrzeuge.</p>
            <Link href="/vehicles/new" className="btn-primary inline-block">
              Fahrzeug hinzufügen
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
