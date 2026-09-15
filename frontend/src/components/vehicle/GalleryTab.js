'use client';

import { useEffect, useRef, useState } from 'react';
import AuthImage from '../AuthImage';
import { apiFetch, API_URL, getToken } from '../../lib/api';

export default function GalleryTab({ vehicle }) {
  const [images, setImages] = useState(vehicle.images || []);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () =>
    apiFetch(`/vehicles/${vehicle.id}`)
      .then((v) => setImages(v.images || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const upload = async (fileList) => {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      [...fileList].forEach((f) => fd.append('images', f));
      const token = getToken();
      const res = await fetch(`${API_URL}/vehicles/${vehicle.id}/uploads/gallery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload fehlgeschlagen.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (imageId) => {
    if (!confirm('Bild löschen?')) return;
    await apiFetch(`/vehicles/${vehicle.id}/uploads/gallery/${imageId}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary w-full lg:w-auto lg:max-w-xs">
        {uploading ? 'Lädt…' : '+ Fotos hinzufügen'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files.length && upload(e.target.files)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative aspect-square">
            <AuthImage attachmentId={img.url} className="w-full h-full object-cover rounded-lg" />
            <button
              onClick={() => remove(img.id)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs leading-5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {images.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Noch keine Bilder.</p>}
    </div>
  );
}
