'use client';

import { useEffect, useState } from 'react';
import { fetchAttachmentUrl } from '../lib/api';

// <img> für Dateien, die über die geschützte /api/attachments/:id Route
// ausgeliefert werden (Header-/Galeriebilder, Tacho-Fotos, Rechnungen).
export default function AuthImage({ attachmentId, alt = '', className = '' }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    if (attachmentId) {
      fetchAttachmentUrl(attachmentId).then((u) => {
        if (!cancelled) {
          objectUrl = u;
          setUrl(u);
        }
      });
    } else {
      setUrl(null);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
