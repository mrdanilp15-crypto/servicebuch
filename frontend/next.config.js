const isProd = process.env.NODE_ENV === 'production';

// Content-Security-Policy: erlaubt nur eigene Skripte/Styles/Verbindungen.
// 'unsafe-inline' ist für Next.js' eingebettetes Start-Skript und Tailwind
// nötig; blob:/data: für die per Fetch geladenen (entschlüsselten) Bilder.
// Im Dev-Modus braucht Next.js zusätzlich eval und Websockets für Hot Reload.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  `connect-src 'self'${isProd ? '' : ' ws: wss:'}`,
  "font-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Kamera nur für die eigene Seite (Tacho-Foto), alles andere aus.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
  ...(isProd ? [{ key: 'Content-Security-Policy', value: csp }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Verrät nicht unnötig, womit die App gebaut ist.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
