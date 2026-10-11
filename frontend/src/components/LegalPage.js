import Link from 'next/link';
import PublicShell from './PublicShell';

// Gemeinsamer Rahmen für Impressum und Datenschutzerklärung.
export default function LegalPage({ title, children }) {
  return (
    <PublicShell wide>
      <div className="mb-4">
        <Link href="/login" className="text-sm text-brand-600 hover:underline">
          ← Zurück zur App
        </Link>
      </div>
      <article className="card space-y-6 text-sm leading-relaxed text-gray-700 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {children}
      </article>
    </PublicShell>
  );
}

export function LegalSection({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

// Anbieterangaben als Block (Name, Anschrift, Kontakt).
export function OperatorBlock({ legal }) {
  return (
    <address className="not-italic whitespace-pre-line rounded-xl bg-gray-50 p-4 text-gray-800">
      {legal.operatorName && <strong className="block">{legal.operatorName}</strong>}
      {legal.operatorAddress && <span className="block">{legal.operatorAddress.replace(/\\n/g, '\n')}</span>}
      {legal.operatorEmail && (
        <span className="block">
          E-Mail:{' '}
          <a className="text-brand-600 underline" href={`mailto:${legal.operatorEmail}`}>
            {legal.operatorEmail}
          </a>
        </span>
      )}
      {legal.operatorPhone && <span className="block">Telefon: {legal.operatorPhone}</span>}
    </address>
  );
}
