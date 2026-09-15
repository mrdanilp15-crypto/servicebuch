'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

const ICONS = {
  dashboard: '🏠',
  vehicles: '🚗',
  add: '➕',
  notifications: '🔔',
  admin: '⚙️',
};

// Desktop-Navigation (linke Seitenleiste). Auf Mobilgeräten unsichtbar -
// dort übernimmt BottomNav dieselbe Funktion.
export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user || pathname === '/login' || pathname === '/register') return null;

  const items = [
    { href: '/dashboard', label: 'Dashboard', icon: ICONS.dashboard },
    { href: '/vehicles', label: 'Fahrzeuge', icon: ICONS.vehicles },
    { href: '/vehicles/new', label: 'Neues Fahrzeug', icon: ICONS.add },
    { href: '/notifications', label: 'Benachrichtigungen', icon: ICONS.notifications },
  ];
  if (user.role === 'ADMIN') items.push({ href: '/admin/users', label: 'Benutzerverwaltung', icon: ICONS.admin });

  return (
    <aside className="hidden lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:sticky lg:top-0 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="text-2xl">🚗</span>
        <div>
          <p className="font-bold leading-tight">Digitales Servicebuch</p>
          <p className="text-xs text-gray-400 leading-tight">Fahrzeugverwaltung</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          let active = pathname === item.href;
          if (!active && item.href === '/vehicles') {
            active = pathname.startsWith('/vehicles/') && pathname !== '/vehicles/new';
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-5 py-4">
        <p className="truncate text-sm font-medium text-gray-800">{user.name}</p>
        <p className="truncate text-xs text-gray-400">{user.email}</p>
        <button onClick={logout} className="mt-2 text-sm font-medium text-gray-500 hover:text-gray-800">
          Abmelden
        </button>
      </div>
    </aside>
  );
}
