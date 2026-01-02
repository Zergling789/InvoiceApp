# Playwright E2E Setup

## Voraussetzungen

- Supabase-Projekt (lokal oder remote) mit angewendeten Migrations.
- Service-Role-Key für seeding/admin (wird nur im Test-Runner genutzt).

## Benötigte Environment-Variablen

Diese Variablen werden von den Playwright-Tests verwendet:

```
# Frontend (Vite / Browser)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Test-Runner (Node)
E2E_SUPABASE_URL=https://<project>.supabase.co
E2E_SUPABASE_SERVICE_ROLE=<service-role-key>
```

Optional können stattdessen `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE` gesetzt werden.

## Was die Tests tun

- Legen einen Test-User und Seed-Daten (Settings + verifizierte Absenderadresse) per Service Role an.
- Erstellen einen Client-Datensatz.
- Führen die UI-Flows für Angebot/ Rechnung aus.
- Mocken `/api/email` in Playwright und schreiben die erwarteten `sent_*` Felder direkt in die DB.

## Ausführen

```
npm run test:e2e
```

Hinweis: Für die E-Mail-Flows ist kein SMTP-Setup nötig, da `/api/email` im Test gemockt wird.
