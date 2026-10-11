'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, isPublicPath } from './AuthProvider';
import Icon from './Icon';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || isPublicPath(pathname)) return null;

  const items = [
    { href: '/dashboard', label: 'Start', icon: 'home' },
    { href: '/vehicles', label: 'Fahrzeuge', icon: 'car' },
    { href: '/vehicles/new', label: 'Neu', icon: 'plus' },
    { href: '/notifications', label: 'Meldungen', icon: 'bell' },
    user.role === 'ADMIN'
      ? { href: '/admin/users', label: 'Verwaltung', icon: 'users' }
      : { href: '/account', label: 'Konto', icon: 'user' },
  ];

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
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
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                active ? 'text-brand-600 font-semibold' : 'text-gray-500'
              }`}
            >
              <Icon name={item.icon} className="h-6 w-6" strokeWidth={active ? 2 : 1.7} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
