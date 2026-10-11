'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Icon from './Icon';

export default function Header({ title, back = false, actions = null }) {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-white/90 backdrop-blur px-4 py-3 lg:px-8 lg:py-6 border-b border-gray-200">
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <button
            onClick={() => router.back()}
            className="-ml-1 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="Zurück"
          >
            <Icon name="arrowLeft" className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg lg:text-2xl font-semibold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {user && (
          <Link
            href="/account"
            aria-label="Mein Konto"
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Icon name="user" className="h-6 w-6" />
          </Link>
        )}
      </div>
    </header>
  );
}
