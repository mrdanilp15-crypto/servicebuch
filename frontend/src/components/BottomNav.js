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

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === '/login' || pathname === '/register') return null;

  const items = [
    { href: '/dashboard', label: 'Start', icon: ICONS.dashboard },
    { href: '/vehicles', label: 'Fahrzeuge', icon: ICONS.vehicles },
    { href: '/vehicles/new', label: 'Neu', icon: ICONS.add },
    { href: '/notifications', label: 'Meldungen', icon: ICONS.notifications },
  ];
  if (user.role === 'ADMIN') items.push({ href: '/admin/users', label: 'Verwaltung', icon: ICONS.admin });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg justify-around">
        {items.map((item) => {
          let active = pathname === item.href;
          if (!active && item.href === '/vehicles') {
            active = pathname.startsWith('/vehicles/') && pathname !== '/vehicles/new';
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                active ? 'text-brand-600 font-semibold' : 'text-gray-500'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
