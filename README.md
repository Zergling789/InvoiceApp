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
```

Deliverability Checklist:
- SPF Record fuer die Versanddomain konfigurieren (provider-spezifisch)
- DKIM aktivieren und public keys eintragen
- DMARC Record setzen (Start: p=none, spaeter p=quarantine/reject)
