## FreelanceFlow – abgeleitete Anforderungen

Quelle: vorhandener Code (u.a. `src/App.tsx`, `src/pages/*`, `src/features/documents/*`, `src/db/*`, `src/types.ts`, `index.html`). Mangels offizieller SPEC im Repo konsolidiert.

### Tech-Stack & Rahmen
- Vite + React 19 + TypeScript, Tailwind-Klassen via CDN (`index.html`).
- Supabase als Backend (Tabellen: `clients`, `projects`, `offers`, `invoices`, `time_entries`, `user_settings`), Auth Pflicht: alle DB-Operationen verlangen eingeloggten User (`user_id`-Filter).
- Env: `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` müssen gesetzt sein; sonst Fehler beim Client-Init.

### Navigation & Layout
- Shell mit Header (Brand + Link zu Einstellungen) und Sidebar-Nav: Dashboard, Kunden, Projekte, Angebote, Rechnungen.
- Main-Content in weißer Card, Seiten per React Router.

### Datenmodelle (siehe `src/types.ts`)
- `UserSettings`: name, companyName, address, taxId, defaultVatRate, defaultPaymentTerms, iban, bic, bankName, email.
- `Client`: id, companyName, contactPerson, email, address, notes.
- `Project`: id, clientId, name, budgetType (`hourly` | `fixed`), hourlyRate, budgetTotal, status (`active` | `completed` | `archived`).
- `Offer`/`Invoice`: id, number, clientId, projectId?, date, validUntil|dueDate, positions[{id, description, quantity, unit, price}], vatRate, introText, footerText, status (Offers: Draft/Sent/Accepted/Rejected/Invoiced; Invoices: Draft/Sent/Overdue/Paid), invoice: paymentDate?, offer: offerId? (beim Umwandeln).

### Dashboard
- Lädt Settings, Clients, Offers, Invoices.
- Kennzahlen:
  - Kundenanzahl.
  - Angebote offen = alle außer `Rejected` & `Invoiced`.
  - Rechnungen offen = alle außer `Paid`.
  - Überfällig = Rechnungen nicht `Paid` mit `dueDate` < heute.
- Link-Buttons zu Kunden/Angeboten/Rechnungen/Projekten/Einstellungen.
- Fehleranzeige bei Ladefehlern.

### Kunden
- Liste aller Clients (sortiert per DB).
- CRUD:
  - Neuer Kunde / Bearbeiten: Pflichtfeld `companyName`; optionale contactPerson, email, address, notes.
  - Löschen mit Confirm.
- Nutzung `dbListClients`, `dbUpsertClient`, `dbDeleteClient`.

### Projekte
- Liste der Projekte (neueste zuerst), inkl. Kunde, Budget-Typ, Status.
- Neues Projekt:
  - Pflicht: name, clientId.
  - budgetType wählbar (`hourly`/`fixed`), Felder hourlyRate & budgetTotal numerisch.
  - Status: active/completed/archived.
  - Fehlermeldungen (Supabase/Netzwerk) humanized.
- Datenquelle: Supabase (`projects`), Client-Liste über `dbListClients`.

### Angebote & Rechnungen
- Route `/offers` & `/invoices` mit Tab-Schaltern.
- Liste:
  - Zeigt Nummer, Kunde, Datum, Betrag (Summe Positionen + MwSt), Status-Badge.
  - Überfällige Rechnungen markieren, leere Zustände & Loading-States.
  - Aktionen: Ansehen (öffnet Editor read-only + Print), Löschen (Confirm).
  - Rechnungen: „Als bezahlt markieren“ setzt `status=PAID`, `paymentDate=now`, verlangt vorhandenes `dueDate`.
  - Angebote: „In Rechnung wandeln“ erstellt Invoice mit neuer Nummer, kopiert Positionen/Intro/Footer, setzt status `SENT`, dueDate basierend auf Settings.paymentTerms; ursprüngliches Angebot -> status `INVOICED`.
- Neuerstellung:
  - `DocumentEditor` mit Seed: Nummer via `dbNextNumber`, Datum heute, Invoice: dueDate = heute + paymentTerms; Offer: validUntil = heute + 14 Tage; intro/footer Text Default abhängig vom Typ; vatRate aus Settings.defaultVatRate.
  - Validierung: Client Pflicht; Invoice: dueDate Pflicht; Offer: validUntil Pflicht.
  - Speichern nutzt `dbUpsertInvoice`/`dbUpsertOffer`, `onSaved` triggert Refresh.
- Viewer/Print:
  - Druckansicht mit Firmen- und Kundendaten, Positionstabelle, Netto/Steuer/Gesamt, Footer; Rechnungen zeigen Bankdaten & Steuerhinweis.
  - Mail-Link mit Betreff `${Rechnung|Angebot} <number>`.

### Einstellungen
- Settings-Seite lädt `dbGetSettings`, zeigt/bearbeitet alle `UserSettings`-Felder und speichert per `dbSaveSettings`; Firmenname Pflicht.

### Dokument-Nummern
- `dbNextNumber(type)` ermittelt höchste Endziffer aus letzten 50 Nummern des Nutzers und erhöht um 1; toleriert Präfixe/Suffixe, nutzt trailing number.

### Nicht-funktionale Anforderungen
- Fehlerbehandlung: DB/Netzwerk-Fehler anzeigen (Alerts/Fehlerboxen vorhanden), keine stillen Fails.
- Keine Magie: Eingaben validieren wie oben beschrieben.
- Druckansicht kompatibel mit Browser-Print (`@media print` Styles in `index.html`).

### Offene Punkte / TODOs
- Der Service-Layer unter `src/app/*` ist aktuell ungenutzt/leer – bei Bedarf mit DB-Layern verheiraten oder entfernen.
- Zeitnachweise (`time_entries`) sind angebunden, aber im UI noch nicht verfügbar.
