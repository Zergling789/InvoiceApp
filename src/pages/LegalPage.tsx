import { Link } from "react-router-dom";

type Kind = "imprint" | "privacy" | "terms";

const content: Record<Kind, { title: string; version?: string; sections: Array<[string, string]> }> = {
  imprint: {
    title: "Impressum",
    sections: [
      ["Betreiberangaben", "Vor Veröffentlichung müssen hier vollständiger Name beziehungsweise Firma, ladungsfähige Anschrift, Vertretungsberechtigte und Kontaktangaben des Betreibers ergänzt werden."],
      ["Register und Umsatzsteuer", "Sofern einschlägig, sind Register, Registernummer, zuständige Aufsicht und Umsatzsteuer-Identifikationsnummer zu ergänzen."],
      ["Hinweis zum Status", "Diese Seite ist ein technischer Platzhalter und noch kein veröffentlichungsfähiges Impressum."],
    ],
  },
  privacy: {
    title: "Datenschutzerklärung",
    version: "Version 2026-07-13",
    sections: [
      ["Verantwortlicher", "Vor Veröffentlichung sind Name, Anschrift und Kontakt des datenschutzrechtlich Verantwortlichen einzutragen."],
      ["Verarbeitete Daten", "FreelanceFlow verarbeitet Konto-, Unternehmens-, Kunden-, Projekt-, Rechnungs- und technische Betriebsdaten, soweit dies für Registrierung, Bereitstellung, Sicherheit, Versand und Support erforderlich ist."],
      ["Auftragsverarbeiter", "Hosting-, Datenbank-, E-Mail- und gegebenenfalls Monitoring-Anbieter sind vor Veröffentlichung mit Anbieter, Zweck, Standort und Rechtsgrundlage vollständig aufzuführen."],
      ["Speicherdauer und Rechte", "Aufbewahrungs- und Löschfristen müssen anhand der tatsächlichen Betriebs- und gesetzlichen Anforderungen festgelegt werden. Betroffene können insbesondere Auskunft, Berichtigung, Löschung, Einschränkung und Datenübertragbarkeit verlangen, soweit die jeweiligen Voraussetzungen vorliegen."],
      ["Entwurfsstatus", "Dieser Text dokumentiert den technischen Produktumfang, ersetzt aber keine rechtliche Prüfung und ist vor einem öffentlichen Start durch den Betreiber zu vervollständigen."],
    ],
  },
  terms: {
    title: "Nutzungsbedingungen",
    version: "Version 2026-07-13",
    sections: [
      ["Leistungsumfang", "FreelanceFlow unterstützt die Erstellung und Verwaltung einfacher inländischer B2B-Rechnungen für deutsche Unternehmen. Nicht unterstützte Steuer- und Auslandssachverhalte werden technisch begrenzt, soweit im Produkt beschrieben."],
      ["Prüfpflicht des Nutzers", "Nutzer müssen Rechnungen und Stammdaten vor dem Ausstellen prüfen. FreelanceFlow erbringt keine steuerliche oder rechtliche Beratung."],
      ["Verfügbarkeit und Datensicherung", "Konkrete Verfügbarkeitszusagen, Supportzeiten, Haftungsregeln und Datensicherungsbedingungen sind vor Veröffentlichung durch den Betreiber festzulegen."],
      ["Entwurfsstatus", "Diese Nutzungsbedingungen sind ein Produktentwurf. Betreiberangaben und abschließende rechtliche Regelungen fehlen noch und müssen vor dem öffentlichen Start ergänzt und geprüft werden."],
    ],
  },
};

export default function LegalPage({ kind }: { kind: Kind }) {
  const page = content[kind];
  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-6 py-12 text-[var(--app-text)]">
      <article className="app-card mx-auto max-w-3xl p-6 sm:p-10">
        <Link to="/" className="text-sm text-[var(--app-primary)]">← Zurück zu FreelanceFlow</Link>
        <h1 className="mt-6 text-3xl font-semibold">{page.title}</h1>
        {page.version && <p className="mt-2 text-sm text-[var(--app-muted)]">{page.version}</p>}
        <div className="mt-8 space-y-7">{page.sections.map(([heading, text]) => <section key={heading}><h2 className="text-lg font-semibold">{heading}</h2><p className="mt-2 text-sm leading-7 text-[var(--app-muted)]">{text}</p></section>)}</div>
      </article>
    </main>
  );
}
