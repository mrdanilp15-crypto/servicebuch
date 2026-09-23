'use client';

import { useEffect, useState } from 'react';
import { fetchAttachmentUrl } from '../lib/api';

// Modul-weiter Cache (überlebt Mounts/Unmounts, z.B. beim Navigieren
// zwischen Fahrzeugliste/Dashboard/Detailseite): dieselbe Anhang-ID wird
// pro Sitzung nur einmal geladen + entschlüsselt statt bei jeder Anzeige
// erneut - das war der Hauptgrund für spürbar langsames Laden von Bildern.
// Speichert bewusst das Promise (nicht erst das Ergebnis), damit zwei
// gleichzeitig angezeigte <AuthImage> mit derselben ID sich einen
// einzigen Request teilen statt doppelt zu laden.
const urlCache = new Map();

function loadAttachment(attachmentId) {
  if (!urlCache.has(attachmentId)) {
    urlCache.set(
      attachmentId,
      fetchAttachmentUrl(attachmentId).catch(() => {
        urlCache.delete(attachmentId); // bei Fehler erneuten Versuch beim nächsten Mount erlauben
        return null;
      })
    );
  }
  return urlCache.get(attachmentId);
}

// <img> für Dateien, die über die geschützte /api/attachments/:id Route
// ausgeliefert werden (Header-/Galeriebilder, Tacho-Fotos, Rechnungen).
export default function AuthImage({ attachmentId, alt = '', className = '' }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (attachmentId) {
      setUrl(null);
      loadAttachment(attachmentId).then((u) => {
        if (!cancelled) setUrl(u);
      });
    } else {
      setUrl(null);
    }
    return () => {
      cancelled = true;
      // Bewusst kein URL.revokeObjectURL hier - die Blob-URL bleibt im
      // urlCache und wird evtl. von anderen gerade sichtbaren
      // <AuthImage>-Instanzen mit derselben ID noch verwendet.
    };
  }, [attachmentId]);

  if (!attachmentId) {
    return <div className={`bg-gray-200 flex items-center justify-center text-3xl ${className}`}>🚗</div>;
  }
  if (!url) {
    return <div className={`bg-gray-100 animate-pulse ${className}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
