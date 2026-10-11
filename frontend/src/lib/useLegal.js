'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from './api';

// Betreiberangaben (Name, Anschrift, Kontakt) für Impressum und
// Datenschutzerklärung. Kommen vom Backend aus Umgebungsvariablen
// (LEGAL_OPERATOR_*), damit jede Instanz ihre eigenen Angaben hinterlegen kann.
export function useLegal() {
  const [legal, setLegal] = useState(null);
  useEffect(() => {
    apiFetch('/legal')
      .then(setLegal)
      .catch(() => setLegal({ operatorName: '', operatorAddress: '', operatorEmail: '', operatorPhone: '' }));
  }, []);
  return legal;
}

export function hasOperator(legal) {
  return !!(legal && (legal.operatorName || legal.operatorAddress || legal.operatorEmail));
}
