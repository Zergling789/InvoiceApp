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
E2E_SUPABASE_ANON_KEY=<anon-key>
```

Optional können stattdessen `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE` gesetzt werden.

## Was die Tests tun

- Legen einen Test-User und Seed-Daten (Settings + verifizierte Absenderadresse) per Service Role an.
- Erstellen einen Client-Datensatz.
- Führen die UI-Flows für Angebot/ Rechnung aus.
- Mocken `/api/email` in Playwright und schreiben die erwarteten `sent_*` Felder direkt in die DB.
- Prüfen die geschützten Kernseiten auf Desktop und Smartphone im Hell- und Dunkelmodus.
- Speichern Screenshots des authentifizierten visuellen Qualitätschecks als GitHub-Artefakt für sieben Tage.

## Ausführen

```
npm run test:e2e
```

Die Suite prüft zusätzlich mit zwei getrennten Benutzern, dass RLS fremdes Lesen, Schreiben und Löschen blockiert. Sie erzeugt und löscht Benutzer und darf deshalb niemals gegen das Produktionsprojekt laufen. Die drei `E2E_SUPABASE_*` Secrets müssen in GitHub auf ein eigenes Testprojekt zeigen. Ohne sie wird der komplette `supabase-e2e`-Job sichtbar übersprungen.

Hinweis: Für die E-Mail-Flows ist kein SMTP-Setup nötig, da `/api/email` im Test gemockt wird.

Der Test `authenticated-visual-audit.spec.ts` prüft zusätzlich horizontales Seiten-Scrollen,
globale Fehleransichten, beschädigte UTF-8-Zeichen, das angewendete Farbschema und die mobile
Navigation. Lokal wird er ohne die drei dedizierten `E2E_SUPABASE_*`-Werte sicher übersprungen.

`npm run test:performance` baut die Produktionsdateien und öffnet die mobile Rechnungserstellung
mit deaktiviertem Browsercache unter einer reproduzierbaren 4G-Drosselung. Das Gate begrenzt Zeit
bis zur bedienbaren Kundenauswahl, LCP, Layoutsprünge, lange Hauptthread-Aufgaben, JavaScript-Bytes,
Request-Anzahl und die Reaktion des ersten Wizard-Schritts. Der JSON-Messbericht wird in GitHub für
14 Tage als Artefakt `authenticated-mobile-performance` gespeichert.
