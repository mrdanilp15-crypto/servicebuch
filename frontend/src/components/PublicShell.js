import Link from 'next/link';
import Icon from './Icon';

// Rahmen für Seiten ohne Login (Anmeldung, Registrierung, Impressum,
// Datenschutz): zentriert und schmal, damit Formulare auf großen Bildschirmen
// nicht über die ganze Breite gezogen werden. Die Rechtliches-Links sind
// hier immer erreichbar.
export default function PublicShell({ children, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col px-4 py-8 sm:px-6">
      <div className={`mx-auto flex w-full flex-1 flex-col justify-center ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        {children}
      </div>
      <footer className="mx-auto mt-8 flex gap-4 text-xs text-gray-500">
        <Link href="/impressum" className="hover:text-gray-800 hover:underline">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-gray-800 hover:underline">
          Datenschutz
        </Link>
      </footer>
    </div>
  );
}

export function BrandHeader({ title, subtitle }) {
  return (
    <div className="mb-8 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
        <Icon name="car" className="h-8 w-8" />
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
