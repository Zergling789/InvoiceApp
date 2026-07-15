# CI-Status

Stand: 14. Juli 2026. Der Workflow liegt in `.github/workflows/ci.yml` und läuft bei jedem Push auf `main`, bei jedem Pull Request sowie manuell über `workflow_dispatch`.

## Pflichtjobs

| Job | Inhalt | Abhängigkeit |
| --- | --- | --- |
| Quality, unit tests and build | `npm ci`, Typecheck, UI-Tests, Server-Tests, Build, Audit | unabhängig |
| Browser smoke and recipient portal | `basic.spec.ts`, `recipient-portal.spec.ts` | unabhängig |
| EN16931 and PDF/A-3 validation | E-Rechnungstests, KoSIT, Mustang, gebrandete PDF/A-3-Prüfung | Java 17, Chromium, Ghostscript, ICC-Profile |
| E-invoice generator container | baut das isolierte Generator-Image einschließlich Prüfsummenprüfung | Docker auf festem Ubuntu-Runner |
| Supabase E2E availability | prüft ausschließlich, ob alle separaten E2E-Secrets vorhanden sind | unabhängig |
| Supabase integration and RLS isolation | Dokumentflüsse, Rechnungsstatus und Zwei-Nutzer-RLS-Test | erfolgreicher Secret-Check |
| CI status report | fasst die Resultate aller Jobs im GitHub Job Summary zusammen | läuft mit `always()` nach allen Jobs |

Fehlen Supabase-Secrets, wird der Integrationsjob als **übersprungen** und nicht als bestandener Test ausgewiesen. Der reine Konfigurationscheck ist kein fachlicher Test.

## Benötigte GitHub-Secrets

Die E2E-Werte müssen auf ein ausschließlich für automatisierte Tests vorgesehenes Supabase-Projekt zeigen:

- `E2E_SUPABASE_URL`: Project URL des Testprojekts
- `E2E_SUPABASE_ANON_KEY`: Publishable-/Anon-Key des Testprojekts
- `E2E_SUPABASE_SERVICE_ROLE`: serverseitiger Service-Role-Key des Testprojekts

Der Service-Role-Key darf niemals als `VITE_*`-Variable, im Browser, in Logs oder in einem Produktions-Frontend verfügbar sein. Die Tests erzeugen eindeutige Benutzer und entfernen sie nach dem Lauf. Sie dürfen nicht gegen das Produktionsprojekt laufen.

## Lokale Befehle

```bash
npm ci
npm run typecheck
npm run test:ui
npm run test:server
npm run test:einvoice
npm run validate:kosit
npm run validate:zugferd
npm run validate:zugferd:branded
npm run build
npm run audit
npx playwright test tests/basic.spec.ts
npx playwright test tests/recipient-portal.spec.ts
npx playwright test tests/flows.spec.ts
npx playwright test tests/invoice-status.spec.ts
npx playwright test tests/rls-isolation.spec.ts
```

`invoice-status.spec.ts` enthält zusätzlich einen mobilen Browserlauf für den vollständigen Finalisierungsdialog. Der Bestätigungsbutton bleibt gesperrt, bis der Marktumfangs- und Prüfungshinweis aktiv bestätigt wurde; anschließend werden sichtbarer Status und Datenbanksperre gemeinsam geprüft.

Für die drei Supabase-Suites sind lokal dieselben `E2E_SUPABASE_*`-Variablen erforderlich. Ohne sie melden die Tests einen Skip; das ist kein bestandener Integrationsnachweis.

## Zuletzt geprüfte Ergebnisse

Der `main`-Lauf [29353413467](https://github.com/Zergling789/InvoiceApp/actions/runs/29353413467) für Commit `d832506` war am 14. Juli 2026 vollständig erfolgreich, einschließlich Supabase-E2E und gebrandeter ZUGFeRD-Validierung.

Am 14. Juli 2026 lokal erfolgreich ausgeführt:

- `npm ci`
- `npm run typecheck`
- `npm run test:ui` – 53 Tests bestanden
- `npm run test:server` – 56 Tests bestanden
- `npm run test:einvoice` – 8 Tests bestanden
- `npm run validate:kosit` – `ACCEPTABLE`
- `npm run validate:zugferd` – PDF und XML valide, eingebettetes XML bytegenau
- `npm run build`
- `npm run audit` – 0 bekannte Schwachstellen
- `npx playwright test tests/basic.spec.ts` – 1 Test bestanden
- `npx playwright test tests/recipient-portal.spec.ts` – 2 Tests bestanden

Lokal nicht als bestanden gewertet:

- `npm run validate:zugferd:branded` – nicht ausführbar, weil Ghostscript 10.x auf dem Windows-Host fehlt; der CI-Job installiert es und der oben verlinkte `main`-Lauf war grün.
- `flows.spec.ts`, `invoice-status.spec.ts` und `rls-isolation.spec.ts` – insgesamt 8 Tests wegen fehlender `E2E_SUPABASE_*`-Variablen übersprungen. Der oben verlinkte dedizierte Supabase-E2E-Lauf war grün.
- `docker build -f services/einvoice-generator/Dockerfile ...` – lokal nicht ausführbar, weil die installierte Docker-Desktop-Engine nicht gestartet ist; der neue Container-CI-Job ist der maßgebliche Build-Nachweis.

Der endgültige Nachweis dieser Workflow-Änderung ist ein neuer grüner Pull-Request- und anschließender `main`-Lauf.

## Bekannte Einschränkungen

- Die externen Validatorartefakte sind per Version und SHA-256 im Repository festgelegt, werden im CI-Lauf jedoch aus den dokumentierten Quellen geladen. Ein Ausfall dieser Quellen blockiert die E-Rechnungsvalidierung.
- Die Ubuntu-Pakete für Ghostscript und ICC-Profile stammen aus dem festen Runner-Image `ubuntu-24.04`; ihre tatsächlich installierten Paketversionen werden im Jobprotokoll ausgegeben.
- Ein grüner CI-Lauf ersetzt weder einen produktiven Generatorbetrieb noch Restore-, Monitoring-, Rechts- oder Datenschutzfreigaben.
