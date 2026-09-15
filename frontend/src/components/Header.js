'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export default function Header({ title, back = false }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-white/90 backdrop-blur px-4 py-3 lg:px-8 lg:py-6 border-b border-gray-200">
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <button onClick={() => router.back()} className="text-xl leading-none px-1" aria-label="Zurück">
            ←
          </button>
        )}
        <h1 className="text-lg lg:text-2xl font-semibold truncate">{title}</h1>
      </div>
      {user && (
        <button onClick={logout} className="text-sm text-gray-500 shrink-0 lg:hidden">
          Abmelden
        </button>
      )}
    </header>
  );
}
