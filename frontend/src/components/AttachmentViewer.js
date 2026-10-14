'use client';

import { useCallback, useEffect, useState } from 'react';
import AuthImage, { loadAttachment } from './AuthImage';
import Icon from './Icon';

// Öffnet eine geschützte Datei (z.B. PDF-Rechnung) in einem neuen Tab. Das
// Fenster muss synchron im Klick geöffnet werden, sonst blockt der Browser
// den Popup - die Datei wird danach nachgeladen.
export function openAttachmentFile(attachmentId) {
  const win = window.open('', '_blank');
  loadAttachment(attachmentId).then((url) => {
    if (!win) return;
    if (url) win.location.href = url;
    else win.close();
  });
}

// Vollbild-Ansicht für ein Bild (Tacho-Foto, Rechnungsfoto, Galerie).
export function Lightbox({ attachmentId, name, onClose }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadAttachment(attachmentId).then((u) => !cancelled && setUrl(u));
    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name || 'Bild'}
      className="fixed inset-0 z-[60] flex flex-col bg-black/90"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 p-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-sm">{name}</p>
        <div className="flex shrink-0 items-center gap-2">
          {url && (
            <a
              href={url}
              download={name || 'bild'}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
            >
              <Icon name="download" className="h-4 w-4" />
              Speichern
            </a>
          )}
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={name || ''}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm text-white/70">Lädt…</p>
        )}
      </div>
    </div>
  );
}

// Klickbares Vorschaubild, das die Lightbox öffnet.
export function ImageThumb({ attachmentId, name, className = 'h-14 w-14', label = 'Bild vergrößern' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}${name ? `: ${name}` : ''}`}
        className={`!min-h-0 !m-0 !p-0 shrink-0 overflow-hidden rounded-lg border border-gray-200 ${className}`}
      >
        <AuthImage attachmentId={attachmentId} alt={name || ''} className="h-full w-full object-cover" />
      </button>
      {open && <Lightbox attachmentId={attachmentId} name={name} onClose={close} />}
    </>
  );
}

// Alle Anhänge eines Eintrags: Bilder als Vorschau (Klick = groß), PDFs und
// sonstige Dateien als Link (Klick = öffnet im neuen Tab).
export function AttachmentList({ attachments = [], thumbClass = 'h-14 w-14' }) {
  if (!attachments.length) return null;
  const images = attachments.filter((a) => a.mimeType?.startsWith('image/'));
  const files = attachments.filter((a) => !a.mimeType?.startsWith('image/'));
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {images.map((a) => (
        <ImageThumb key={a.id} attachmentId={a.id} name={a.originalName} className={thumbClass} />
      ))}
      {files.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => openAttachmentFile(a.id)}
          className="!m-0 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
        >
          <Icon name="document" className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate">{a.type === 'INVOICE' ? 'Rechnung: ' : ''}{a.originalName || 'Datei'}</span>
        </button>
      ))}
    </div>
  );
}
