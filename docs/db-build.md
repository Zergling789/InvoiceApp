# Supabase DB Build

## Reihenfolge der Migrationen (empfohlen)
1. `supabase/migrations/00000000000000_init_master.sql`
2. `supabase/migrations/basic.sql`
3. `supabase/migrations/20251220_sender_identities.sql`
4. `supabase/migrations/20251222_document_numbering.sql`
5. `supabase/migrations/20251225_invoice_locking.sql`
6. `supabase/migrations/20251226_offer_invoice_tracking.sql`
7. `supabase/migrations/20251227_normalize_status_values.sql`
8. `supabase/migrations/20251228_fix_invoice_locking_trigger.sql`
9. `supabase/migrations/20251229_add_last_sent_to.sql`
10. `supabase/migrations/20251230_db_status_canonical_and_transitions.sql`
11. `supabase/migrations/20251231_db_invoice_locking_content_only.sql`
12. `supabase/migrations/20251232_db_finalize_invoice_rpc.sql`
13. `supabase/migrations/20251233_db_mark_document_sent_rpc.sql`
14. `supabase/migrations/20251234_secure_rpc_remove_userid.sql`
15. `supabase/migrations/20251235_rls_offers_invoices.sql`
16. `supabase/migrations/20251236_document_activity.sql`
17. `supabase/migrations/20251237_convert_offer_to_invoice_rpc.sql`
18. `supabase/migrations/20251238_activity_triggers.sql`
19. `supabase/migrations/20260102_add_offer_currency.sql`

## 1-Befehl Setup
- `supabase db reset`

> Hinweis: Der Supabase CLI-Reset führt alle Migrations in Reihenfolge aus. Die Master-Migration ist idempotent und stellt den finalen Zustand her; nachfolgende Migrationen sind ebenfalls idempotent und bleiben damit wiederholbar.
