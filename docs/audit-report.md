# Supabase Audit Report (IST-Zustand)

## 1) Migration Order (empfohlen)
1. `supabase/migrations/basic.sql`
2. `supabase/migrations/20251220_sender_identities.sql`
3. `supabase/migrations/20251222_document_numbering.sql`
4. `supabase/migrations/20251225_invoice_locking.sql`
5. `supabase/migrations/20251226_offer_invoice_tracking.sql`
6. `supabase/migrations/20251227_normalize_status_values.sql`
7. `supabase/migrations/20251228_fix_invoice_locking_trigger.sql`
8. `supabase/migrations/20251229_add_last_sent_to.sql`
9. `supabase/migrations/20251230_db_status_canonical_and_transitions.sql`
10. `supabase/migrations/20251231_db_invoice_locking_content_only.sql`
11. `supabase/migrations/20251232_db_finalize_invoice_rpc.sql`
12. `supabase/migrations/20251233_db_mark_document_sent_rpc.sql`
13. `supabase/migrations/20251234_secure_rpc_remove_userid.sql`
14. `supabase/migrations/20251235_rls_offers_invoices.sql`
15. `supabase/migrations/20251236_document_activity.sql`
16. `supabase/migrations/20251237_convert_offer_to_invoice_rpc.sql`
17. `supabase/migrations/20251238_activity_triggers.sql`
18. `supabase/migrations/20260102_add_offer_currency.sql`

## 2) SQL-Inventar

### Tabellen (inkl. SQL-Dateien)
- `public.user_settings` (`basic.sql`)
- `public.clients` (`basic.sql`)
- `public.projects` (`basic.sql`)
- `public.offers` (`basic.sql`, zusätzliche Spalten über spätere Migrations)
- `public.invoices` (`basic.sql`, zusätzliche Spalten über spätere Migrations)
- `public.sender_identities` (`20251220_sender_identities.sql`)
- `public.sender_identity_tokens` (`20251220_sender_identities.sql`)
- `public.audit_events` (`20251220_sender_identities.sql`)
- `public.document_counters` (`20251222_document_numbering.sql`)
- `public.document_activity` (`20251234_secure_rpc_remove_userid.sql`, erneut in `20251236_document_activity.sql`)

### Views
- Keine `CREATE VIEW`-Statements gefunden.

### Policies (RLS)
- `user_settings_select_own`, `user_settings_insert_own`, `user_settings_update_own` (`basic.sql`)
- `clients_select_own`, `clients_insert_own`, `clients_update_own`, `clients_delete_own` (`basic.sql`)
- `projects_select_own`, `projects_insert_own`, `projects_update_own`, `projects_delete_own` (`basic.sql`)
- `sender_identities_select_own`, `sender_identities_insert_own`, `sender_identities_update_own`, `sender_identities_delete_own` (`20251220_sender_identities.sql`)
- `document_counters_select_own`, `document_counters_insert_own`, `document_counters_update_own` (`20251222_document_numbering.sql`)
- `offers_select_own`, `offers_insert_own`, `offers_update_own`, `offers_delete_own` (`20251235_rls_offers_invoices.sql`)
- `invoices_select_own`, `invoices_insert_own`, `invoices_update_own`, `invoices_delete_own` (`20251235_rls_offers_invoices.sql`)
- `document_activity_select_own`, `document_activity_insert_own` (`20251236_document_activity.sql`)

## 3) Supabase-Nutzung im Frontend/Backend (Tabellen/Spalten)

### Backend (`server/index.js`)
- **`sender_identities`**: `id`, `user_id`, `email`, `display_name`, `status`, `verified_at`, `last_verification_sent_at`, `updated_at`, `created_at` (Create/Update/List/Verify/Disable).
- **`sender_identity_tokens`**: `sender_identity_id`, `token_hash`, `expires_at`, `used_at`, `request_ip`, `user_agent` (Create/Consume/Update).
- **`audit_events`**: `user_id`, `action`, `entity_type`, `entity_id`, `meta` (Insert via `audit()` helper).
- **`user_settings`**: `company_name`, `address`, `tax_id`, `iban`, `bic`, `bank_name`, `footer_text`, `default_sender_identity_id` (PDF payload + default sender identity update).
- **`clients`**: `id`, `company_name`, `contact_person`, `email`, `address` (PDF payload).
- **`offers`**: `id`, `user_id`, `number`, `client_id`, `project_id`, `date`, `valid_until`, `positions`, `intro_text`, `footer_text`, `vat_rate` (PDF payload); RPC: `mark_offer_sent` (via `supabase.rpc`).
- **`invoices`**: `id`, `user_id`, `number`, `client_id`, `project_id`, `date`, `due_date`, `positions`, `intro_text`, `footer_text`, `vat_rate` (PDF payload); RPC: `mark_invoice_sent` (via `supabase.rpc`).

### Frontend/Shared DB-Layer
- **`src/db/offersDb.ts`** (`offers`): `id`, `user_id`, `number`, `client_id`, `project_id`, `currency`, `date`, `valid_until`, `positions`, `intro_text`, `footer_text`, `vat_rate`, `status`, `sent_at`, `last_sent_at`, `last_sent_to`, `sent_count`, `sent_via`, `invoice_id`, `updated_at`.
- **`src/db/invoicesDb.ts`** (`invoices`): `id`, `user_id`, `number`, `offer_id`, `client_id`, `project_id`, `date`, `due_date`, `payment_date`, `positions`, `intro_text`, `footer_text`, `vat_rate`, `status`, `is_locked`, `finalized_at`, `sent_at`, `last_sent_at`, `last_sent_to`, `sent_count`, `sent_via`, `updated_at`.
- **`src/db/clientsDb.ts`** (`clients`): `id`, `user_id`, `company_name`, `contact_person`, `email`, `address`, `notes`, `updated_at`.
- **`src/db/projectsDb.ts`** (`projects`): `id`, `user_id`, `client_id`, `name`, `budget_type`, `hourly_rate`, `budget_total`, `status`, `updated_at`.
- **`src/db/settingsDb.ts`** (`user_settings`): `user_id`, `name`, `company_name`, `address`, `tax_id`, `default_vat_rate`, `default_payment_terms`, `iban`, `bic`, `bank_name`, `email`, `email_default_subject`, `email_default_text`, `logo_url`, `primary_color`, `template_id`, `locale`, `currency`, `prefix_invoice`, `prefix_offer`, `number_padding`, `footer_text`, `default_sender_identity_id`, `updated_at`.
- **`src/db/documentsDb.ts`**: RPC `next_document_number` (backs `document_counters`).
- **`src/features/documents/ActivityTimeline.tsx`**: `document_activity` (`id`, `event_type`, `meta`, `created_at`) via `.from("document_activity")`.
- **`src/features/documents/DocumentEditor.tsx`, `DocumentDetailPage.tsx`, `TodosPage.tsx`**: RPCs `finalize_invoice`, `convert_offer_to_invoice`.

### UI/Services (indirekt über DB-Layer)
- **Offers/Invoices/Clients/Projects**: `src/app/*Service.ts`, `src/app/*Queries.ts`, `src/data/repositories/*Repo.ts`, und Seiten wie `DocumentsHubPage`, `DocumentsList`, `DocumentEditor`, `DocumentDetailPage`, `Projects`, `Clients`, `Dashboard`, `TodosPage`.
- **Sender Identities**: `src/app/senderIdentities/senderIdentitiesService.ts`, `src/app/email/emailService.ts`, `src/features/settings/SettingsView.tsx`, `src/features/documents/SendDocumentModal.tsx` (Nutzung von `defaultSenderIdentityId`).

## 4) Referenzen auf `last_sent_to` & ähnliche Felder

### SQL
- `20251226_offer_invoice_tracking.sql`: `sent_at`, `last_sent_at`, `sent_count`, `sent_via` (offers/invoices).
- `20251229_add_last_sent_to.sql`: `last_sent_to` (offers/invoices).
- `basic.sql`: `sent_at`, `last_sent_at`, `last_sent_to`, `sent_count`, `sent_via` (offers/invoices in Basisschema).
- `20251233_db_mark_document_sent_rpc.sql` & `20251234_secure_rpc_remove_userid.sql`: setzen `last_sent_at`, `last_sent_to`, `sent_count`, `sent_via` in RPCs `mark_offer_sent`/`mark_invoice_sent`.

### Code
- `src/db/offersDb.ts`: Mapping/Upsert von `sent_at`, `last_sent_at`, `last_sent_to`, `sent_count`, `sent_via`.
- `src/db/invoicesDb.ts`: Mapping/Upsert von `sent_at`, `last_sent_at`, `last_sent_to`, `sent_count`, `sent_via`.
- `src/features/documents/state/documentState.ts`: nutzt `sent_at`/`sent_count` in Statuslogik.

**Nicht gefunden:** direkte Referenzen auf `sent_to` oder `sent_email` als Spaltennamen (außer `last_sent_to`).

## 5) Schema vs Code Mismatch Liste

### Beobachtungen
- **Keine offensichtlichen Spalten-/Tabellennamen-Abweichungen** zwischen SQL und den Supabase-Queries in `src/db/*` sowie `server/index.js` gefunden.
- **Typische Modell-Drift (geringes Risiko):**
  - `invoices.number` ist in der DB nullable (`basic.sql`), im Frontend-Typ aber `string` (erwartet befüllt). Kann in frühen Draft-States zu `null`-Werten führen, die im UI zu leeren Strings normalisiert werden müssen.
  - `user_settings` enthält `default_sender_identity_id`, während `dbSaveSettings()` dieses Feld nicht schreibt (aktuell via eigener API-Route gesetzt). Funktional okay, aber beim „Save Settings“-Flow wird dieses Feld nicht aktualisiert.

## 6) Risiko-Hinweise (RLS/401/PDF)
- **RLS & Service Role:** Der Backend-Server nutzt `SUPABASE_SERVICE_ROLE` (Admin-Client). Ohne diese Env-Config schlagen viele Admin-Queries fehl (500). Das betrifft u.a. `sender_identities`, `sender_identity_tokens`, `audit_events`, PDF- und Email-Flows.
- **RLS ohne Policies:** `sender_identity_tokens` und `audit_events` haben RLS aktiviert (Migration `20251220_sender_identities.sql`), aber keine Policies definiert. Clientseitige Nutzung per anon key wäre damit blockiert; der Server benötigt Service Role.
- **PDF-Routen:**
  - `/api/pdf` und `/api/pdf/link` verlangen Auth (401 ohne Bearer Token).
  - `/api/pdf/download` nutzt Token-Access ohne Auth; bei abgelaufen/invaliden Token kommt 401. Zusätzlich kann PDF-Rendering an fehlender Playwright/Chromium-Config scheitern (500 mit `CHROMIUM_MISSING` oder `CHROMIUM_MISSING`-ähnlichen Codes).
