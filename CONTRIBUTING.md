# Contributing

Kurz und schmerzlos – damit Änderungen sauber bleiben.

## Workflow
1. Issue/Task definieren (oder `TODO.md` referenzieren).
2. Kleine, thematische Commits.
3. Vor PR/Merge:
   ```bash
   npm run build
   npm run test
   npm run test:server
   npm run test:ui
   ```

## Style & Konventionen
- TypeScript strikt: keine „any“-Durchwinke ohne Grund.
- Business-Logik nicht in JSX verstecken → Funktionen/Helpers.
- DB-Zugriffe nur über `src/db/*`.
- Neue Features brauchen mindestens:
  - Typenupdate (`src/types.ts`)
  - UI-Flow
  - Fehlerzustände
  - (wo sinnvoll) Tests

## Commit-Namen (empfohlen)
- `feat: ...` neue Funktion
- `fix: ...` Bugfix
- `refactor: ...` Umstrukturierung ohne Verhalten zu ändern
- `docs: ...` Doku
