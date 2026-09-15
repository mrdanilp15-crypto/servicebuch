import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import BottomNav from '../components/BottomNav';

export const metadata = {
  title: 'Digitales Servicebuch',
  description: 'Digitales Servicebuch fürs Auto - Fahrzeuge, Services, Erinnerungen.',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <AuthProvider>
          <div className="mx-auto min-h-screen max-w-lg bg-gray-100 pb-20">{children}</div>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
