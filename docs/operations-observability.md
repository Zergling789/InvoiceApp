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

## Incident-Ablauf

1. Zeitpunkt, betroffenen Endpunkt und Request-ID erfassen.
2. Deployment- und Readiness-Status prüfen.
3. Strukturierte Logs anhand der Request-ID korrelieren, ohne Nutzdaten zu kopieren.
4. Bei Datenrisiko Zugriffe begrenzen und den Vorfall dokumentieren.
5. Nach der Behebung einen Regressionstest ergänzen und die Ursache sowie Maßnahmen festhalten.

Logs dürfen nicht als dauerhafte Ablage für Rechnungs-, Kontakt- oder Authentifizierungsdaten verwendet werden. Aufbewahrungsfristen sind beim gewählten Hosting- und Monitoring-Anbieter separat festzulegen.
