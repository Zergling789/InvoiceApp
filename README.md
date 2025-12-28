## FreelanceFlow DACH

Leichte Angebots- und Rechnungs-App für Freelancer im DACH-Raum.

### Setup
1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. ENV-Variablen setzen (z. B. in `.env.local`):
   ```
   VITE_SUPABASE_URL=<your-project-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
   Optional für lokale API-Calls (Proxy in `vite.config.ts`):
   ```
   VITE_API_PROXY=http://localhost:4000
   ```
3. Entwicklung starten:
   ```bash
   npm run dev
   ```
4. Build prüfen:
   ```bash
   npm run build
   ```

Supabase muss ein eingeloggter User liefern (`auth.getSession/getUser`), da alle DB-Aufrufe nutzergebundene Filter setzen.

### E-Mail Versand (Verified Reply-To)
Backend verwendet SMTP und setzt `Reply-To` ausschliesslich auf verifizierte Absenderadressen.

Benötigte ENV-Variablen (Server):
```
SUPABASE_URL=<your-project-url>
SUPABASE_SERVICE_ROLE=<your-service-role-key>
APP_BASE_URL=https://app.lightningbold.com
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass>
SMTP_FROM=billing@lightningbold.com
SENDER_DOMAIN_NAME=Lightning Bold
REDIS_URL=<optional-rate-limit-redis>
LOG_SERVER_CONFIG=1
```

Deliverability Checklist:
- SPF Record fuer die Versanddomain konfigurieren (provider-spezifisch)
- DKIM aktivieren und public keys eintragen
- DMARC Record setzen (Start: p=none, spaeter p=quarantine/reject)

### PDF-Generierung (Serverless)
Die PDF-Erstellung nutzt Playwright + Chromium. In Serverless (z. B. Vercel)
wird `@sparticuz/chromium` verwendet.

Benötigte Dependencies:
```
playwright-core
@sparticuz/chromium
```

Optional (Vercel empfohlen):
```
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
```

### Vercel Deployment
1. Projekt importieren (Vercel Dashboard).
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variablen setzen:
   - **Client (VITE_*)**
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - optional: `VITE_API_BASE_URL` (wenn API nicht gleicher Origin)
   - **Server**
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE`
     - `APP_BASE_URL` (deployed URL)
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
     - `SENDER_DOMAIN_NAME` (optional)
     - `REDIS_URL` (optional, für Rate-Limiting)
     - `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (optional)
     - `LOG_SERVER_CONFIG=1` (optional, Startup-Config-Log in Vercel)
5. Deploy auslösen.

Troubleshooting:
- **PDF-Generierung fehlschlägt:** Stelle sicher, dass `@sparticuz/chromium`
  installiert ist und keine Edge Runtime verwendet wird.
- **E-Mail fehlschlägt:** Prüfe SMTP-Creds + ob `SMTP_FROM` gesetzt ist.

### Lokale Tests/Checks (optional)
```bash
npm run build
npm run test:ui
```
