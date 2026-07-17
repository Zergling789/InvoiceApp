# Logging, Monitoring und Incident Response

## Endpunkte

- `GET /api/health` ist ein reiner Liveness-Check. HTTP 200 bedeutet, dass der Prozess antwortet.
- `GET /api/health/ready` prüft die notwendige Supabase-Konfiguration und einen minimalen Datenbankzugriff. HTTP 503 bedeutet, dass die Instanz keinen Produktivverkehr erhalten soll.

Beide Antworten enthalten weder Zugangsdaten noch interne Datenbankfehler. Der Readiness-Endpunkt liefert nur den Zustand der einzelnen Prüfklassen und eine Request-ID.

## Strukturierte Logs

Der Server schreibt pro Request ein JSON-Ereignis mit Request-ID, Route, Methode, Status und Laufzeit. Fehler werden nur mit Fehlerklasse und stabilem Fehlercode protokolliert; Stacktraces und Fehlermeldungen werden nicht in Produktionslogs übernommen. Felder mit Zugangsdaten, Cookies, Passwörtern oder Tokens werden rekursiv redigiert.

Wenn `LOG_HASH_SALT` gesetzt ist, kann eine Benutzer-ID als verkürzter SHA-256-Wert korreliert werden. Ohne Salt wird keine Benutzerkennung geloggt. Das Salt ist ein Server-Geheimnis und darf weder mit `VITE_` beginnen noch im Repository gespeichert werden.

## Empfohlene Alarme

- Readiness liefert länger als zwei Minuten HTTP 503.
- Anteil der HTTP-5xx-Antworten überschreitet fünf Prozent in fünf Minuten.
- p95-Laufzeit der API überschreitet zwei Sekunden in zehn Minuten.
- Wiederholte Fehlercodes für PDF-, E-Mail-, Export- oder Finalisierungsvorgänge.

Die JSON-Ausgabe ist bewusst anbieterneutral und kann später über den Hosting-Log-Drain an Sentry, Datadog oder einen vergleichbaren Dienst weitergeleitet werden. Zugangsdaten des Monitoring-Anbieters gehören ausschließlich in die Hosting-Umgebung.

`ERROR_REPORTER_MODE=off` verwendet die standardmäßige No-op-Implementierung. `structured-log` aktiviert den anbieterneutralen Reporter und schreibt ausschließlich redigierte technische Kontexte in den vorhandenen Logpfad. Session Replay ist nicht implementiert und damit deaktiviert. Request-Bodies, Formulare, Prompts, Bilder, Rechnungs-, Kunden- und Dokumentdaten werden über die zentrale Redaction entfernt. `LOG_RETENTION_DAYS` dokumentiert die gewünschte Frist; die tatsächliche Löschung muss zusätzlich beim Log-Drain-Anbieter konfiguriert werden.

`request_completed` liefert Requestanzahl, 4xx/5xx, Route und Laufzeit und ermöglicht p50/p95-Berechnung im Log-Backend. Fachliche Fehler sind anhand stabiler Codes für PDF, E-Rechnung, E-Mail, Stripe, Export, Löschworker, Login, Rate Limit und KI filterbar. Der Generator protokolliert separat Laufzeit, Timeout und Validierungsstatus ohne Inhalte.

## Incident-Ablauf

1. Zeitpunkt, betroffenen Endpunkt und Request-ID erfassen.
2. Deployment- und Readiness-Status prüfen.
3. Strukturierte Logs anhand der Request-ID korrelieren, ohne Nutzdaten zu kopieren.
4. Bei Datenrisiko Zugriffe begrenzen und den Vorfall dokumentieren.
5. Nach der Behebung einen Regressionstest ergänzen und die Ursache sowie Maßnahmen festhalten.

Logs dürfen nicht als dauerhafte Ablage für Rechnungs-, Kontakt- oder Authentifizierungsdaten verwendet werden. Aufbewahrungsfristen sind beim gewählten Hosting- und Monitoring-Anbieter separat festzulegen.

## Browserseitige Wiederherstellung

Authentifizierte API-Aufrufe besitzen standardmäßig ein Zeitlimit von 60 Sekunden. Ein Timeout liefert im Browser den stabilen Code `NETWORK_TIMEOUT` und weist darauf hin, vor einer Wiederholung zunächst den fachlichen Status zu prüfen. Browser-Netzwerkfehler werden als `OFFLINE` oder `NETWORK_UNAVAILABLE` vereinheitlicht; Rohmeldungen wie `Failed to fetch` werden nicht als Nutzertext angezeigt.

Eine HTTP-401-Antwort eines authentifizierten API-Aufrufs löst zentral den lokalen Session-Ablauf aus. Die geschützte App entfernt die lokale Sitzung und leitet mit einem verständlichen Hinweis zur Anmeldung weiter. Schlägt bereits die lokale Sitzungsprüfung wegen eines Netzwerkfehlers fehl, wird die Sitzung nicht vorschnell verworfen; stattdessen bleibt ein erneuter Prüfversuch möglich.

Der Browser zeigt einen globalen Offlinehinweis und bestätigt kurz die wiederhergestellte Verbindung. Die Anwendung behauptet dabei keinen Offline-Speichermodus: Speichern, Finalisieren und Senden erfordern weiterhin eine erreichbare Serververbindung.

Unbekannte öffentliche und geschützte Routen werden nicht still umgeleitet. Eine eigene 404-Seite erklärt den Zustand und bietet sichere Rückwege zur Startseite, Anmeldung beziehungsweise zum Arbeitsbereich. Dadurch bleibt die fehlerhafte URL für Support und Diagnose sichtbar, ohne sie im UI zu wiederholen.

Nicht abgefangene Browser-, Promise- und React-Renderfehler erhalten eine zufällige Fehler-ID. Der öffentliche Endpunkt `POST /api/client-errors` nimmt ausschließlich diese ID, eine feste Fehlerart und den aktuellen Pfad an. Query-Parameter werden verworfen; Empfänger-Tokens, UUIDs und lange opaque Pfadsegmente werden vor dem strukturierten Logging ersetzt. Fehlermeldungen, Stacktraces, Request-Bodies, Dokument-, Kunden- und Formulardaten werden weder vom Browser gesendet noch vom Endpunkt protokolliert. Der Endpunkt ist pro IP begrenzt und darf den eigentlichen Fehlerpfad niemals blockieren.

Kritische Arbeitsbereiche verwenden einen gemeinsamen Ladefehlerzustand. Nach einem fehlgeschlagenen Abruf werden weder Nullbeträge noch „keine Daten“-Aussagen angezeigt. Technische Provider- oder Datenbankmeldungen bleiben verborgen, ein erneuter Abruf ist direkt möglich und zustandsverändernde Aktionen bleiben gesperrt, solange ihre Ausgangsdaten nicht verlässlich geladen wurden.
