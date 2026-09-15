'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import OverviewTab from '../../../components/vehicle/OverviewTab';
import ServicesTab from '../../../components/vehicle/ServicesTab';
import MileageTab from '../../../components/vehicle/MileageTab';
import GalleryTab from '../../../components/vehicle/GalleryTab';
import RemindersTab from '../../../components/vehicle/RemindersTab';
import { apiFetch } from '../../../lib/api';

const TABS = [
  { key: 'overview', label: 'Übersicht' },
  { key: 'services', label: 'Service' },
  { key: 'mileage', label: 'Kilometer' },
  { key: 'gallery', label: 'Galerie' },
  { key: 'reminders', label: 'Erinnerungen' },
];

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    apiFetch(`/vehicles/${id}`)
      .then(setVehicle)
      .catch((e) => setError(e.message));
  }, [id]);

  const deleteVehicle = async () => {
    if (!confirm('Dieses Fahrzeug inkl. aller Einträge unwiderruflich löschen?')) return;
    await apiFetch(`/vehicles/${id}`, { method: 'DELETE' });
    router.replace('/vehicles');
  };

  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!vehicle) return <p className="p-4 text-gray-500">Lade Fahrzeug…</p>;

  return (
    <div>
      <Header title={`${vehicle.make} ${vehicle.model}`} back />

      <div className="flex gap-1 lg:gap-2 overflow-x-auto px-4 lg:px-8 pt-3 pb-1 sticky top-[57px] lg:top-[89px] bg-gray-100 z-20">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 lg:px-4 py-1.5 lg:py-2 text-sm lg:text-base font-medium ${
              tab === t.key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 lg:p-8">
        {tab === 'overview' && <OverviewTab vehicle={vehicle} onChange={setVehicle} />}
        {tab === 'services' && <ServicesTab vehicle={vehicle} />}
        {tab === 'mileage' && <MileageTab vehicle={vehicle} />}
        {tab === 'gallery' && <GalleryTab vehicle={vehicle} />}
        {tab === 'reminders' && <RemindersTab vehicle={vehicle} />}

        {tab === 'overview' && (
          <button onClick={deleteVehicle} className="w-full mt-4 text-sm text-red-600 py-2 lg:max-w-2xl lg:block">
            Fahrzeug löschen
          </button>
        )}
      </div>
    </div>
  );
}
