import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Digitales Servicebuch',
  description: 'Digitales Servicebuch fürs Auto - Fahrzeuge, Services, Erinnerungen.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Servicebuch',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
          <div className="lg:flex">
            <Sidebar />
            <div className="min-h-screen flex-1 bg-gray-100 pb-20 lg:pb-0">
              <div className="mx-auto max-w-lg lg:max-w-7xl">{children}</div>
            </div>
          </div>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
