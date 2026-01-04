# Dev workflow

## Invoice numbering
- Die Rechnungsnummer wird in `public.invoices.invoice_number` gespeichert.
- Draft-Rechnungen behalten `invoice_number = NULL`.
- Konfiguration pro User erfolgt in `public.user_settings`:
  - `invoice_number_prefix` (Default: `RE`)
  - `invoice_number_padding` (Default: `3`)
  - `invoice_number_include_year` (Default: `true`)
  - `invoice_number_next` (Default: `1`, wird bei jeder Finalisierung atomar erhöht)
- Format:
  - Mit Jahr: `PREFIX-YYYY-XXX` (z. B. `RE-2026-001`)
  - Ohne Jahr: `PREFIX-XXX`

## Finalize flow
- Endpunkt: `POST /api/invoices/:id/finalize`
- Ablauf:
  1. Auth-Check (API), Supabase-User-Client mit Bearer-Token (auth.uid()).
  2. DB-RPC `finalize_invoice` sperrt die Rechnung row und holt die nächste Nummer atomar.
  3. Setzt `invoice_number` (falls leer), `finalized_at`, `status = 'ISSUED'`, `is_locked = true`.
  4. Trigger verhindert nach Finalisierung jede Änderung an `invoice_number`.
  5. DB-Trigger sperrt inhaltliche Updates auf `public.invoices` sobald `is_locked = true`.

## Invoice status model
- Statuswerte: `DRAFT`, `ISSUED`, `SENT`, `PAID`, `CANCELED`.
- Status ist nicht frei editierbar, sondern über Aktionen:
  - `POST /api/invoices/:id/finalize` → `ISSUED`
  - `POST /api/invoices/:id/mark-sent` → `SENT` (nur aus `ISSUED`)
  - `POST /api/invoices/:id/mark-paid` → `PAID` (aus `ISSUED`/`SENT`)
  - `POST /api/invoices/:id/cancel` → `CANCELED` (aus `ISSUED`/`SENT`)
- DB-Trigger validieren die Übergänge:
  - `DRAFT → ISSUED`
  - `ISSUED → SENT | PAID | CANCELED`
  - `SENT → PAID | CANCELED`
  - `PAID`/`CANCELED` sind terminal.
- Konsistenzregeln:
  - `ISSUED`/`SENT`/`PAID`/`CANCELED` setzen `is_locked = true`.
  - `PAID` setzt `paid_at` (und `payment_date`) automatisch.
  - `CANCELED` setzt `canceled_at` automatisch.
- `finalized_at` ist der kanonische Timestamp für die Finalisierung (`DRAFT -> ISSUED`).
- Overdue ist ein berechneter Zustand über `is_overdue`:
  - `status in ('ISSUED','SENT')` und `due_date < today` und `paid_at`/`canceled_at` ist `null`.

## Zahlungsbedingungen & Fälligkeit
- Standard-Zahlungsziel pro User: `public.user_settings.payment_terms_days` (Default: `14`).
- Snapshot pro Rechnung: `public.invoices.invoice_date`, `public.invoices.payment_terms_days`, `public.invoices.due_date`.
- `due_date` wird ausschließlich DB-seitig aus `invoice_date + payment_terms_days` berechnet.
- Einstellungen wirken nur auf neue Rechnungen (bestehende Rechnungen behalten ihren Snapshot).
- Overdue-Berechnung bleibt ausschließlich auf Basis von `due_date` (siehe Statusmodell oben).
- Nach Finalisierung (`is_locked = true` oder `finalized_at != null`) sind `invoice_date`, `payment_terms_days` und `due_date` unveränderlich.

## Kundensnapshot auf Rechnungen
- Rechnungen speichern beim Anlegen den Kundensnapshot in `public.invoices.client_*`.
- Änderungen am Kundenstamm verändern bestehende Rechnungen nicht.
- Snapshot wird spätestens bei der Finalisierung gesetzt (DB-RPC `finalize_invoice` prüft `client_name`).
- Drafts aktualisieren den Snapshot bei jedem Speichern automatisch aus dem Kundenstamm.
- `client_name` darf nicht leer sein, sobald `status != 'DRAFT'`.
- Nach Finalisierung (`is_locked = true`) sind Snapshot-Felder unveränderlich.
- Drafts übernehmen den Snapshot beim Auswählen/Ändern des Kunden im Editor.
