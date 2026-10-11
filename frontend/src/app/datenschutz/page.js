'use client';

import Link from 'next/link';
import LegalPage, { LegalSection, OperatorBlock } from '../../components/LegalPage';
import { hasOperator, useLegal } from '../../lib/useLegal';

function Ul({ children }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

export default function DatenschutzPage() {
  const legal = useLegal();

  return (
    <LegalPage title="Datenschutzerklärung">
      <LegalSection title="1. Verantwortlicher">
        {legal && hasOperator(legal) ? (
          <OperatorBlock legal={legal} />
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            Der Betreiber dieser Instanz hat noch keine Angaben hinterlegt (siehe Hinweis im{' '}
            <Link href="/impressum" className="underline">
              Impressum
            </Link>
            ). Ansprechpartner ist die Person, die dir den Zugang zu dieser Anwendung gegeben hat.
          </p>
        )}
        <p>
          „Digitales Servicebuch“ ist eine selbst gehostete Anwendung. Alle Daten liegen ausschließlich auf dem Server des
          Betreibers. Es gibt keine Weitergabe an Dritte zu Werbe- oder Analysezwecken, keine Tracking- oder
          Statistik-Dienste und keine von außen nachgeladenen Inhalte (Schriftarten, Skripte, Karten o. Ä.).
        </p>
      </LegalSection>

      <LegalSection title="2. Welche Daten werden verarbeitet?">
        <Ul>
          <li>
            <strong>Konto:</strong> Name, E-Mail-Adresse, Passwort (nur als nicht umkehrbarer Argon2id-Hash), Rolle,
            Anlagezeitpunkt.
          </li>
          <li>
            <strong>Fahrzeug- und Wartungsdaten:</strong> Kennzeichen, Hersteller, Modell, Baujahr,
            Fahrzeug-Identifikationsnummer (FIN), Kilometerstände, Service-Einträge (Datum, Art, Werkstatt, Kosten,
            Notizen), Erinnerungen, frei vergebene Tags und die Zuordnung, wer auf welches Fahrzeug zugreifen darf.
            Kennzeichen und FIN können einen Personenbezug haben.
          </li>
          <li>
            <strong>Dateien:</strong> hochgeladene Fotos und Rechnungen (PDF). Sie werden verschlüsselt (AES-256-GCM)
            gespeichert. Bei Bildern werden Metadaten wie Aufnahmeort (GPS) und Gerätemodell beim Hochladen entfernt.
          </li>
          <li>
            <strong>Benachrichtigungen:</strong> Meldungen zu Fälligkeiten sowie – nur wenn du Push aktivierst – die
            Adresse und Schlüssel deines Browser-Push-Abonnements.
          </li>
          <li>
            <strong>Technische Zugriffsdaten:</strong> Das Anwendungsprotokoll enthält nur Aufrufmethode, Pfad,
            Statuscode und Antwortzeit – keine IP-Adressen und keine Browserkennung. Ein vorgeschalteter Webserver oder
            Reverse-Proxy des Betreibers kann zusätzlich IP-Adressen protokollieren; Näheres teilt der Betreiber mit.
          </li>
        </Ul>
      </LegalSection>

      <LegalSection title="3. Zwecke und Rechtsgrundlagen">
        <Ul>
          <li>
            Bereitstellung der Funktionen (Fahrzeugverwaltung, Servicebuch, PDF-Export, Erinnerungen): Art. 6 Abs. 1
            lit. b DSGVO (Nutzungsverhältnis) bzw. lit. f (berechtigtes Interesse an einem sicheren, funktionierenden
            Betrieb).
          </li>
          <li>Push-Benachrichtigungen: Einwilligung, Art. 6 Abs. 1 lit. a DSGVO. Du kannst sie jederzeit widerrufen,
            indem du Push im Dashboard deaktivierst.</li>
        </Ul>
        <p>
          Die Angabe von Name, E-Mail und Passwort ist für ein Konto erforderlich; ohne sie kann die Anwendung nicht
          genutzt werden. Eine automatisierte Entscheidungsfindung oder Profilbildung findet nicht statt.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies und lokale Speicherung">
        <p>
          Die Anwendung setzt <strong>keine Cookies</strong>. Im lokalen Speicher deines Browsers liegt ausschließlich
          das Anmelde-Token (<code>sb_token</code>), das für die Anmeldung technisch erforderlich ist und beim Abmelden
          gelöscht wird, sowie eine Offline-Seite für die Installation als App. Dafür ist nach § 25 Abs. 2 Nr. 2 TDDDG
          keine Einwilligung nötig.
        </p>
      </LegalSection>

      <LegalSection title="5. Push-Benachrichtigungen und Drittanbieter">
        <p>
          Wenn du Push aktivierst, werden Benachrichtigungen über den Push-Dienst deines Browser-Herstellers zugestellt
          (z. B. Google, Mozilla, Apple, Microsoft oder Samsung). Dorthin gelangen die verschlüsselte Nachricht und
          technische Verbindungsdaten; das kann eine Übermittlung in Drittländer (z. B. USA) bedeuten. Ohne Aktivierung
          findet das nicht statt.
        </p>
      </LegalSection>

      <LegalSection title="6. Speicherdauer und Löschung">
        <Ul>
          <li>Daten bleiben gespeichert, bis du sie löschst oder der Administrator dein Konto löscht.</li>
          <li>
            Wird ein Fahrzeug, ein Service-Eintrag oder ein Anhang gelöscht, wird auch die zugehörige Datei auf dem
            Server entfernt.
          </li>
          <li>
            Beim Löschen deines Kontos werden Konto, Benachrichtigungen und Push-Abonnements entfernt sowie
            Fahrzeuge, die nur du genutzt hast, samt Dateien. Fahrzeuge, die auch andere nutzen, bleiben für diese
            erhalten.
          </li>
          <li>Anmelde-Tokens sind höchstens 7 Tage gültig und verfallen bei Passwortänderung sofort.</li>
        </Ul>
      </LegalSection>

      <LegalSection title="7. Deine Rechte">
        <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht auf Widerruf einer Einwilligung.
        </p>
        <Ul>
          <li>
            <strong>Auskunft und Datenübertragbarkeit:</strong> unter{' '}
            <Link href="/account" className="text-brand-600 underline">
              Mein Konto
            </Link>{' '}
            → „Meine Daten exportieren“ (maschinenlesbar als JSON).
          </li>
          <li>
            <strong>Berichtigung:</strong> alle Angaben lassen sich in der Anwendung selbst ändern.
          </li>
          <li>
            <strong>Löschung:</strong> unter „Mein Konto“ → „Konto löschen“.
          </li>
        </Ul>
        <p>
          Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. der Behörde deines
          Bundeslandes.
        </p>
      </LegalSection>

      <LegalSection title="8. Sicherheit">
        <p>
          Passwörter werden mit Argon2id gehasht, Dateien verschlüsselt abgelegt, der Zugriff auf Fahrzeuge ist nach
          Rollen (Besitzer, Bearbeiter, Betrachter) getrennt, und Anmeldeversuche sind begrenzt. Die Verschlüsselung der
          Verbindung (HTTPS) stellt der Betreiber über seinen Reverse-Proxy sicher.
        </p>
      </LegalSection>

      <LegalSection title="9. Hinweis zu Fotos">
        <p>
          Lade bitte nur Fotos hoch, auf denen keine fremden Personen oder Kennzeichen erkennbar sind – oder für die
          die Betroffenen eingewilligt haben.
        </p>
      </LegalSection>

      <p className="border-t border-gray-100 pt-4 text-xs text-gray-400">
        Stand: Oktober 2026. Diese Erklärung ist ein Mustertext für die Standardfunktionen der Software und ersetzt keine
        Rechtsberatung. Betreiber sind selbst dafür verantwortlich, sie an ihre Instanz (Hosting, Reverse-Proxy,
        eigene Änderungen) anzupassen.
      </p>
    </LegalPage>
  );
}
