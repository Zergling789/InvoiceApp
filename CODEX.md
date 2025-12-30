# CODEX – Arbeitskontext & Leitplanken

Diese Datei ist **für Codex/Agenten** gedacht. Sie bündelt Projektwissen, damit Änderungen zielgerichtet und ohne „Rate mal“ passieren.

## Was dieses Repo ist
**FreelanceFlow DACH** ist eine Web-App zum Erstellen/Verwalten von **Angeboten** und **Rechnungen** (inkl. Druck/PDF und optionalem E-Mail-Versand).

- **Frontend:** Vite + React + TypeScript
- **Backend:** Supabase (Auth + DB)
- **Server (Node/Express):** optional für SMTP-Mail und PDF/Rendering-Endpoints (z. B. Vercel)

Die konsolidierten Produktanforderungen stehen in **`SPEC.md`**.

## Quickstart (lokal)
1. Abhängigkeiten:
   ```bash
   npm install
   ```
2. Frontend-ENV in `.env.local`:
   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   # optional
   VITE_API_PROXY=http://localhost:4000
   ```
3. Dev-Server (Frontend + Node-Server parallel):
   ```bash
   npm run dev
   ```
4. Build:
   ```bash
   npm run build
   ```

## Wichtige Ordner & Dateien
- `src/` – React App
  - `src/pages/*` – Pages/Routen (UI)
  - `src/features/*` – Feature-Module (UI + Flow)
  - `src/db/*` – Supabase-Queries und Persistenz
  - `src/types.ts` – zentrale Typen (Client/Project/Offer/Invoice/UserSettings …)
- `server/` – Express-Server für E-Mail/PDF (bei Vercel via `/api/*` geroutet)
- `api/` – Vercel Serverless Functions / Routing-Glue (je nach Setup)
- `supabase/migrations` – DB-Migrationen

## Datenhaltung: Supabase
- Auth ist Pflicht: viele Queries filtern nach `user_id`.
- Typische Tabellen: `clients`, `projects`, `offers`, `invoices`, `time_entries`, `user_settings`.

**Regel:**
- Änderungen am Datenmodell ⇒ zuerst `src/types.ts` + DB-Layer (`src/db/*`) + Migration (falls nötig).

## Backend/Server: E-Mail & PDF
- E-Mail-Versand läuft über SMTP und setzt `Reply-To` nur auf verifizierte Adressen (siehe README).
- PDF/Print/HTML-Rendering wird serverseitig unterstützt (Playwright/Chromium in serverless Umgebungen).

**Regel:**
- Keine Geheimnisse in Client-Code. Server-ENV bleibt serverseitig (ohne `VITE_` Prefix).

## Qualitäts-Gates (bevor PR/Merge)
Minimal:
```bash
npm run build
npm run test
npm run test:server
npm run test:ui
```
Wenn nicht alles existiert/greift: mindestens `build` + die betroffenen Tests.

## Coding-Konventionen (damit Codex nicht kreativ-chaotisch wird)
- **Keine neuen Dependencies**, außer es gibt einen klaren Nutzen und es wird in der Doku begründet.
- **DB-Zugriffe gehören in `src/db/*`**, nicht direkt in UI-Komponenten.
- **Typen zuerst:** Änderungen an Shapes/DTOs immer in `src/types.ts` spiegeln.
- **Fehlerbehandlung ist Teil der Feature-Funktionalität** (kein „silent fail“).
- **Kleine, reversible Commits**: lieber 3 saubere Schritte als 1 Monster.

## Typische Änderungen (bewährte Reihenfolge)
1. `SPEC.md`/Anforderung verstehen (oder ergänzen, wenn unklar).
2. Typen (`src/types.ts`) anpassen.
3. DB-Layer (`src/db/*`) erweitern/ändern.
4. UI/Feature (`src/features/*` oder `src/pages/*`) implementieren.
5. Tests anpassen/ergänzen.
6. Docs aktualisieren (mindestens README oder passende .md hier).

## Anti-Ziele (bitte nicht)
- „Schnellfix“ mit Logik in JSX ohne Tests.
- Env-Keys ins Repo schreiben oder in den Browser leaken.
- Duplicate Business-Logik in mehreren Komponenten.
- Unnötige Rewrites (Refactor nur, wenn es konkrete Probleme löst).

## Was bereits als Kontext existiert
- `README.md` – Setup, ENV, Deployment, SMTP/PDF Hinweise
- `SPEC.md` – konsolidierte Anforderungen aus dem bestehenden Code
- `TODO.md` – priorisierte Aufgabenliste / Plan
