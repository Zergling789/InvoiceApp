# Environment Variablen

Diese App nutzt **Frontend-ENV** (Vite: `VITE_*`) und **Server-ENV** (Node/Express). Vermische das nicht.

## Frontend (Vite)
In `.env.local` (nicht committen):

- `VITE_SUPABASE_URL` – Supabase Projekt-URL
- `VITE_SUPABASE_ANON_KEY` – Supabase anon/public key


## Server (Express / Vercel)
In Server-ENV (Vercel Environment Variables oder lokal `.env`):

### Supabase (Admin)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE` – **niemals** in den Client!

### App/Links
- `APP_BASE_URL` – Basis-URL fürs Frontend (für Links/Redirects)

### SMTP (E-Mail)
- `SMTP_HOST`
- `SMTP_PORT` (default 587)
- `SMTP_USER` (optional, falls Auth)
- `SMTP_PASS` (wenn `SMTP_USER` gesetzt ist)
- `SMTP_FROM` (oder `SMTP_USER` als Fallback)
- `SENDER_DOMAIN_NAME` (optional)

### Sessions / Redis (optional)
- `REDIS_URL` oder `UPSTASH_REDIS_URL`
- `SESSION_SECRET` – dringend in Produktion setzen

### PDF / Runtime
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (optional, Vercel empfohlen)
- `PDF_DOWNLOAD_TOKEN_TTL_MS` (optional)
- `LOG_SERVER_CONFIG=1` (optional, loggt Startup-Konfig)

## Beispiel
Siehe `.env.example` im Repo.
