// Server-seitiger Reverse-Proxy zum Backend, implementiert als Route
// Handler statt als next.config.js "rewrites()". Grund: rewrites() wird
// von Next.js beim BUILD ausgewertet (der Wert wird fest in das Image
// gebacken) - ein Route Handler dagegen ist normaler Server-Code, der bei
// JEDEM Request neu läuft und process.env.BACKEND_INTERNAL_URL daher
// korrekt zur LAUFZEIT liest. Nur so funktioniert ein einmal gebautes,
// generisches Image mit einer zur Laufzeit gesetzten Backend-Adresse
// (siehe next.config.js für die (falsche) rewrites()-Vorgängerlösung).
export const dynamic = 'force-dynamic';

function backendUrl() {
  return process.env.BACKEND_INTERNAL_URL || 'http://localhost:4000';
}

async function handle(request, { params }) {
  const path = (params.path || []).join('/');
  const search = new URL(request.url).search;
  const target = `${backendUrl()}/api/${path}${search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');

  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body;
    init.duplex = 'half';
  }

  const backendRes = await fetch(target, init);

  const responseHeaders = new Headers(backendRes.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('transfer-encoding');

  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: responseHeaders,
  });
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
