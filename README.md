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
