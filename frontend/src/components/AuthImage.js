'use client';

import { useEffect, useState } from 'react';
import { fetchAttachmentUrl } from '../lib/api';
import Icon from './Icon';

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

// Beim Abmelden leeren: Bilder des bisherigen Nutzers sollen nicht im
// Arbeitsspeicher des Browsers bleiben, wenn sich auf demselben Gerät jemand
// anderes anmeldet.
export function clearImageCache() {
  for (const promise of urlCache.values()) {
    promise.then((url) => url && URL.revokeObjectURL(url)).catch(() => {});
  }
  urlCache.clear();
}

// <img> für Dateien, die über die geschützte /api/attachments/:id Route
// ausgeliefert werden (Header-/Galeriebilder, Tacho-Fotos, Rechnungen).
export default function AuthImage({ attachmentId, alt = '', className = '' }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (attachmentId) {
      setUrl(null);
      setFailed(false);
      loadAttachment(attachmentId).then((u) => {
        if (cancelled) return;
        setUrl(u);
        setFailed(!u);
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

  // Kein Bild gesetzt oder nicht ladbar (gelöscht/fehlt auf dem Server): Platzhalter statt endloser Ladeanimation.
  if (!attachmentId || failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-300 ${className}`}>
        <Icon name="car" className="h-1/2 w-1/2 max-h-16 max-w-16" strokeWidth={1.4} />
      </div>
    );
  }
  if (!url) {
    return <div className={`bg-gray-100 animate-pulse ${className}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
