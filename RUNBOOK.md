# Runbook (Betrieb/Deployment)

## Lokale Entwicklung
- `npm run dev` startet Frontend + Server parallel.
- Frontend läuft typischerweise auf Vite-Port (z. B. 5173), Server auf `:4000`.

## Vercel Deployment
Die wichtigsten Punkte stehen in `README.md` (ENV, Routing, PDF/Chromium).

**Checkliste vor Deploy:**
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` gesetzt (Client)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE` gesetzt (Server)
- SMTP-Variablen gesetzt (falls Mail-Funktion aktiv)
- `APP_BASE_URL` korrekt
- Bei PDF-Rendering: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` und (falls nötig) `@sparticuz/chromium` im Deployment

## Häufige Fehlerbilder
### PDF schlägt fehl
- Ursache: fehlendes Chromium/Playwright in Serverless Umgebung oder falsche Runtime.
- Fix: Vercel-Setup prüfen, ggf. `@sparticuz/chromium` hinzufügen und Edge-Runtime vermeiden.

### API liefert HTML statt JSON
- Ursache: SPA-Fallback fängt `/api/*` ab.
- Fix: Vercel-Routing (`vercel.json`) prüfen, damit `/api/*` nicht auf `index.html` fällt.

### SMTP „not configured“
- Ursache: `SMTP_HOST` oder `SMTP_FROM` fehlen.
- Fix: `ENV.md`/README nachziehen und erneut deployen.
