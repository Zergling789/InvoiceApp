# Architekturüberblick

Diese App ist in drei Schichten gedacht: **UI (React)** → **DB-Layer (Supabase)** → optional **Server (Express) für PDF/E-Mail**.

## High-Level Datenfluss
1. User logged in via Supabase Auth.
2. UI lädt/ändert Daten über den DB-Layer (`src/db/*`).
3. Für spezielle Dinge (PDF-Generierung, SMTP) ruft die UI den Node-Server über `/api/*` auf.

## Frontend (Vite/React)
- Einstieg: `src/main.tsx`
- Routing/Shell: typischerweise `src/App.tsx` (oder `src/pages/*` als Routen-Komponenten)
- UI-Bausteine: `src/components/*`, `src/ui/*`
- Features: `src/features/*` bündelt Flow + Views pro Domäne

### Domänen
- **Kunden (clients)**
- **Projekte (projects)**
- **Angebote (offers)**
- **Rechnungen (invoices)**
- **Einstellungen (user_settings)**

## Persistenz (Supabase)
- Client-seitige Supabase-Instanz: `supabaseClient.ts` (und/oder `src/db/*` nutzt diese)
- DB-Operationen zentralisieren in `src/db/*`:
  - List/Upsert/Delete für Clients/Projects/Offers/Invoices
  - Nummernlogik (`dbNextNumber`) und Settings-Reads

**Leitplanke:** UI-Komponenten sprechen nicht „roh“ Supabase an. Sie rufen Funktionen im DB-Layer.

## Server (Express)
- Einstieg: `server/index.js`
- Verantwortungen:
  - SMTP-Mail Versand (Nodemailer)
  - PDF/HTML-Rendering (PDFKit, Playwright/Chromium je nach Deploy)
  - Optional: Sessions/Rate-Limiting (Redis)

**Deploy-Kontext:** Auf Vercel kann der Server über Serverless Functions und `vercel.json` geroutet sein.

## Ordner-Matrix
- `src/` → Browser Code
- `server/` → Node Code (server only)
- `api/` → Serverless Entrypoints/Adapter (falls genutzt)
- `supabase/` → Migrationen/Schema
- `tests/` + `server/tests/` → E2E & Server-Tests

## Entscheidungsregeln
- Feature betrifft Daten? → Typen + DB-Layer zuerst.
- Feature betrifft Mail/PDF? → Server-Route + klare Request/Response DTOs.
- Refactor? → nur wenn er:
  - Bugs verhindert,
  - Tests vereinfacht,
  - oder messbar DX/Lesbarkeit verbessert.
