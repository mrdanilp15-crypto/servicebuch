'use client';

import { useState } from 'react';

// Frei definierbare Tags statt einer festen Liste: Enter oder Komma fügt
// den aktuellen Text als neuen Tag hinzu, Klick auf ✕ entfernt ihn.
export default function TagInput({ value = [], onChange, suggestions = [] }) {
  const [draft, setDraft] = useState('');

  const addTag = (raw) => {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setDraft('');
  };

  const removeTag = (tag) => {
    onChange(value.filter((t) => t !== tag));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const unusedSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 text-sm px-3 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Tag "${tag}" entfernen`}
              className="text-brand-500 hover:text-brand-800"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Eigenen Tag eingeben und Enter drücken (z. B. Privat, Firma, Feuerwehr …)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" onClick={() => addTag(draft)} className="btn-secondary shrink-0">
          Hinzufügen
        </button>
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {unusedSuggestions.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => addTag(s)}
              className="text-xs rounded-full bg-gray-100 text-gray-500 px-2.5 py-1 hover:bg-gray-200"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
