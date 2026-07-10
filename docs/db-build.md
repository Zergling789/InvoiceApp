# Supabase DB Build

## Aktive Migrationen

Der aktive Verlauf liegt vollständig unter `supabase/migrations/`:

1. `00000000000000_init_master.sql` als ursprüngliche Baseline
2. normalisierte historische Migrationen mit 14-stelligen Versionsnummern
3. `20260710073510_baseline_security_hardening.sql` als aktueller Security-Stand

Alle aktiven Versionen sind im Live-Projekt `invoice_app` als angewendet
registriert. `supabase/legacy_migrations/basic.sql` bleibt ausschließlich als
historische Referenz erhalten.

## Lokaler Neuaufbau

```bash
supabase db reset
```

Der Supabase CLI-Reset führt die aktive, timestamp-kompatible Kette in
lexikografischer Reihenfolge aus.
