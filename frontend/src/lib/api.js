// Immer ein relativer Pfad: der Next.js-Server proxied /api/* serverseitig
// zum Backend (siehe next.config.js -> rewrites, gesteuert über die
// Laufzeit-Variable BACKEND_INTERNAL_URL). Dadurch ist im Browser-Bundle
// keine feste Backend-Adresse eingebacken - ein einmal gebautes Image
// funktioniert unabhängig davon, unter welchem Hostnamen/welcher IP die
// App später aufgerufen wird.
const API_URL = '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sb_token');
}

// Generischer JSON-Fetch-Wrapper mit Authorization-Header und
// einheitlichem Fehlerformat ({ error: string }).
async function apiFetch(path, { method = 'GET', body, isForm = false, headers = {} } = {}) {
  const token = getToken();
  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  // Abgelaufene/ungültige Sitzung: AuthProvider hört auf dieses Event und
  // leitet zum Login. (Beim Login selbst bedeutet 401 nur "falsches Passwort".)
  if (res.status === 401 && token && !path.startsWith('/auth/login') && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sb-unauthorized'));
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (data && data.error) || `Fehler ${res.status}`;
    throw new Error(message);
  }
  return data;
}

// Lädt eine geschützte Datei (Bild/PDF) als Blob-URL, da <img src> keine
// Authorization-Header mitschicken kann.
async function fetchAttachmentUrl(attachmentId) {
  if (!attachmentId) return null;
  const token = getToken();
  const res = await fetch(`${API_URL}/attachments/${attachmentId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// Lädt eine Datei (PDF, JSON-Export, ...) herunter und stößt den Browser-
// Download an. Der Dateiname kommt vom Server (Content-Disposition); Fehler
// werden als Exception mit lesbarer Meldung geworfen, damit die UI sie zeigen kann.
async function downloadFile(path, fallbackName = 'download') {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = `Download fehlgeschlagen (Fehler ${res.status}).`;
    try {
      message = (await res.json()).error || message;
    } catch {
      // keine JSON-Antwort - Standardmeldung bleibt
    }
    throw new Error(message);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;

  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
}

export { API_URL, apiFetch, downloadFile, fetchAttachmentUrl, getToken };
