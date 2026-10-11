'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Icon from './Icon';
import { isPublicPath } from './AuthProvider';

// Desktop-Navigation (linke Seitenleiste). Auf Mobilgeräten unsichtbar -
// dort übernimmt BottomNav dieselbe Funktion.
export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user || isPublicPath(pathname)) return null;

  const items = [
    { href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/vehicles', label: 'Fahrzeuge', icon: 'car' },
    { href: '/vehicles/new', label: 'Neues Fahrzeug', icon: 'plus' },
    { href: '/notifications', label: 'Benachrichtigungen', icon: 'bell' },
  ];
  if (user.role === 'ADMIN') items.push({ href: '/admin/users', label: 'Benutzerverwaltung', icon: 'users' });

  return (
    <aside className="hidden lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:sticky lg:top-0 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Icon name="car" className="h-6 w-6" />
        </span>
        <div>
          <p className="font-bold leading-tight">Digitales Servicebuch</p>
          <p className="text-xs text-gray-400 leading-tight">Fahrzeugverwaltung</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Hauptnavigation">
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
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-3 py-3">
        <Link
          href="/account"
          aria-current={pathname === '/account' ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition ${
            pathname === '/account' ? 'bg-brand-50' : 'hover:bg-gray-50'
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <Icon name="user" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-gray-800">{user.name}</span>
            <span className="block truncate text-xs text-gray-400">Mein Konto</span>
          </span>
        </Link>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        >
          <Icon name="logout" className="h-5 w-5" />
          Abmelden
        </button>
        <p className="mt-2 px-3.5 text-xs text-gray-400">
          <Link href="/impressum" className="hover:text-gray-600">Impressum</Link>
          {' · '}
          <Link href="/datenschutz" className="hover:text-gray-600">Datenschutz</Link>
        </p>
      </div>
    </aside>
  );
}
