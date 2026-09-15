const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

export { API_URL, apiFetch, fetchAttachmentUrl, getToken };
