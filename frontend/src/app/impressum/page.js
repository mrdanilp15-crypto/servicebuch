'use client';

import LegalPage, { LegalSection, OperatorBlock } from '../../components/LegalPage';
import { hasOperator, useLegal } from '../../lib/useLegal';

export default function ImpressumPage() {
  const legal = useLegal();

  return (
    <LegalPage title="Impressum">
      {!legal ? (
        <p className="text-gray-400">Lade…</p>
      ) : hasOperator(legal) ? (
        <LegalSection title="Angaben gemäß § 5 DDG">
          <OperatorBlock legal={legal} />
        </LegalSection>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-medium">Für diese Instanz sind keine Anbieterangaben hinterlegt.</p>
          <p className="mt-1">
            Wer „Digitales Servicebuch“ geschäftsmäßig oder öffentlich anbietet, ist in Deutschland zu Anbieterangaben
            verpflichtet (§ 5 DDG). Betreiber tragen Name, Anschrift und Kontakt über die Umgebungsvariablen{' '}
            <code>LEGAL_OPERATOR_NAME</code>, <code>LEGAL_OPERATOR_ADDRESS</code>, <code>LEGAL_OPERATOR_EMAIL</code> und{' '}
            <code>LEGAL_OPERATOR_PHONE</code> ein (siehe README, Abschnitt „Rechtliches“). Bei rein privater, nicht
            geschäftsmäßiger Nutzung im Familien- oder Freundeskreis ist in der Regel kein Impressum erforderlich.
          </p>
        </div>
      )}

      <LegalSection title="Software">
        <p>
          „Digitales Servicebuch“ ist freie Software unter der MIT-Lizenz. Quellcode und Lizenztext:{' '}
          <a
            className="text-brand-600 underline"
            href="https://github.com/mrdanilp15-crypto/servicebuch"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/mrdanilp15-crypto/servicebuch
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Inhalte">
        <p>
          Die Inhalte (Fahrzeugdaten, Service-Einträge, Kosten, Fälligkeiten) stammen von den Nutzerinnen und Nutzern.
          Für deren Richtigkeit, Vollständigkeit und Aktualität wird keine Gewähr übernommen. Exportierte Servicebuch-PDFs
          sind Eigenangaben der Fahrzeughalter und kein amtlicher oder von einer Werkstatt bestätigter Nachweis.
          Erinnerungen an Fälligkeiten (z. B. TÜV, Ölwechsel) sind eine Gedächtnisstütze und ersetzen nicht die
          Herstellervorgaben oder gesetzliche Fristen.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
