# Release-Checkliste v1

Statuswerte: `OFFEN`, `IN_ARBEIT`, `BLOCKIERT`, `ERLEDIGT`, `EXTERN_ZU_PRÜFEN`.

| Bereich | Status | Nachweis / nächster Schritt |
| --- | --- | --- |
| Infrastruktur | IN_ARBEIT | CI und Vercel Preview grün; Produktionsvariablen und Generator-Hosting offen |
| E-Rechnung | IN_ARBEIT | KoSIT/Mustang und Container-Build grün; produktiver Generator noch nicht deployed |
| Stripe | IN_ARBEIT | Webhooks/Entitlements implementiert; Testmodus-End-to-End und Steuerbehandlung extern prüfen |
| Datenschutz | EXTERN_ZU_PRÜFEN | Datenflüsse und Entwürfe vorhanden; Rechtsgrundlagen/Fristen/AVV offen |
| Recht | EXTERN_ZU_PRÜFEN | Seiten vorhanden; Betreiberwerte und juristische Freigabe erforderlich |
| Accountlöschung | BLOCKIERT | Policy-Engine fail-closed; Aufbewahrungsstrategie nicht freigegeben |
| Datenexport | IN_ARBEIT | sicherer synchroner Metadatenexport; Binärdateien/asynchroner Großexport offen |
| Monitoring | IN_ARBEIT | Adapter/Alarme dokumentiert; realer Log-Drain und Alarmrouting offen |
| Backup | BLOCKIERT | Runbook/Template vorhanden; praktischer Restore nicht durchgeführt |
| RLS | ERLEDIGT | dedizierter Zwei-Nutzer-CI-Job zuletzt grün; nach Migrationen erneut erforderlich |
| Beta | IN_ARBEIT | Einmal-Allowlist und serverseitiger Auth-Hook implementiert; Aktivierung und Positiv-/Negativtest im produktiven Supabase-Projekt offen |
| Support | OFFEN | reale Supportadresse, Zuständigkeit und Reaktionsprozess festlegen |
| Incident Response | IN_ARBEIT | Runbook vorhanden; Kontakte und Rufbereitschaft fehlen |

## Sicherheitsprüfung

- `ERLEDIGT`: RLS-Isolation, manipulierte Empfängertokens, serverseitige Eigentümerfilter, Raw-Body-Stripe-Signatur, Dependency-Audit, Secret-Suche, Service-Role nur im Server.
- `ERLEDIGT`: CSP, HSTS, Clickjacking-, MIME- und Referrer-Header; explizite Cross-Site-Schreibrequests werden blockiert.
- `IN_ARBEIT`: manipulierte Export-/Lösch-/Stripe-IDs werden durch Eigentümerfilter begrenzt; zusätzliche vollständige API-Negativmatrix vor Release ausführen.
- `OFFEN`: private Storage-Isolation im praktischen Restore-Test und produktive CORS/Domain-Prüfung nach finaler Domainkonfiguration.

## Launch-Gates

Kein kostenpflichtiger Start, solange Generator-Deployment, Stripe-Testmodus, Betreiberkonfiguration, Rechts-/Datenschutzfreigabe, Aufbewahrungspolicy, Restore-Test, Monitoringalarme und Beta-Zugangskontrolle nicht nachweisbar abgeschlossen sind.
