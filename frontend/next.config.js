// BACKEND_INTERNAL_URL wird zur LAUFZEIT gelesen (nicht beim Build gebacken),
// damit ein einmal gebautes/gepulltes Image in jeder Umgebung funktioniert:
// - Docker Compose/Portainer: zeigt per Default auf den Service-Namen
//   "backend" im selben Docker-Netzwerk.
// - Lokale Entwicklung ohne Docker: zeigt per Default auf localhost:4000.
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
