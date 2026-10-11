'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import OverviewTab from '../../../components/vehicle/OverviewTab';
import ServicesTab from '../../../components/vehicle/ServicesTab';
import MileageTab from '../../../components/vehicle/MileageTab';
import GalleryTab from '../../../components/vehicle/GalleryTab';
import RemindersTab from '../../../components/vehicle/RemindersTab';
import { useAuth } from '../../../components/AuthProvider';
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
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    apiFetch(`/vehicles/${id}`)
      .then(setVehicle)
      .catch((e) => setError(e.message));
  }, [id]);

  const deleteVehicle = async () => {
    if (!confirm('Dieses Fahrzeug inkl. aller Einträge, Fotos und Rechnungen unwiderruflich löschen?')) return;
    try {
      await apiFetch(`/vehicles/${id}`, { method: 'DELETE' });
      router.replace('/vehicles');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !vehicle) return <p className="p-4 text-red-600">{error}</p>;
  if (!vehicle) return <p className="p-4 text-gray-500">Lade Fahrzeug…</p>;

  // Eigene Rolle an diesem Fahrzeug: Admins dürfen alles, sonst zählt die
  // Zuweisung. Das Backend prüft jede Aktion ohnehin selbst - hier werden nur
  // Bedienelemente ausgeblendet, die ohne Berechtigung ins Leere liefen.
  const myRole =
    user?.role === 'ADMIN' ? 'OWNER' : vehicle.assignments?.find((a) => a.userId === user?.id)?.role || 'VIEWER';
  const isOwner = myRole === 'OWNER';
  const canEdit = isOwner || myRole === 'EDITOR';

  return (
    <div>
      <Header title={`${vehicle.make} ${vehicle.model}`} back />

      <div
        role="tablist"
        aria-label="Fahrzeugbereiche"
        className="flex gap-1 lg:gap-2 overflow-x-auto px-4 lg:px-8 pt-3 pb-1 sticky top-[57px] lg:top-[89px] bg-gray-100 z-20"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
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
        {!canEdit && (
          <p className="mb-4 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
            Du hast hier nur Leserechte (Betrachter): Einträge ansehen und PDF exportieren ist möglich, ändern nicht.
          </p>
        )}

        {tab === 'overview' && <OverviewTab vehicle={vehicle} onChange={setVehicle} canEdit={canEdit} isOwner={isOwner} />}
        {tab === 'services' && <ServicesTab vehicle={vehicle} canEdit={canEdit} />}
        {tab === 'mileage' && <MileageTab vehicle={vehicle} canEdit={canEdit} />}
        {tab === 'gallery' && <GalleryTab vehicle={vehicle} canEdit={canEdit} />}
        {tab === 'reminders' && <RemindersTab vehicle={vehicle} canEdit={canEdit} />}

        {tab === 'overview' && isOwner && (
          <>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <button onClick={deleteVehicle} className="w-full mt-4 text-sm text-red-600 py-2 lg:max-w-2xl lg:block">
              Fahrzeug löschen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
