# Deployment des E-Rechnungs-Generators

## Zweck und Grenze

Der Dienst unter `services/einvoice-generator` übernimmt eine bereits erzeugte Sicht-PDF und das kanonische CII-XML. Er konvertiert die PDF nach PDF/A-3, bettet das XML mit Mustang ein, validiert das Ergebnis und extrahiert das XML erneut für einen bytegenauen SHA-256-Vergleich. Er trifft keine steuerlichen Entscheidungen.

## Image bauen und starten

```bash
docker build -f services/einvoice-generator/Dockerfile -t freelanceflow/einvoice-generator:2.24.0 .
docker run --read-only --user node --tmpfs /tmp/einvoice:rw,noexec,nosuid,size=256m \
  --memory=768m --cpus=1.5 --pids-limit=128 \
  -e EINVOICE_GENERATOR_TOKENS=<aktuelles-token>,<vorheriges-token> \
  -p 127.0.0.1:8080:8080 freelanceflow/einvoice-generator:2.24.0
```

Das Image verwendet Node 24.16.0, Java 17, Ghostscript 10.x, Mustang 2.24.0 und KoSIT Validator 1.6.2. Die beiden JAR-Dateien werden nur während des Builds heruntergeladen und durch fest hinterlegte SHA-256-Werte geprüft. Im laufenden Container erfolgen keine Tool-Downloads. Vor einem Produktions-Rollout soll das gebaute Image zusätzlich über seine Registry-Digest referenziert werden.

## API-Vertrag

`POST /v1/zugferd` akzeptiert ausschließlich:

```json
{
  "requestId": "request-id",
  "visiblePdfBase64": "...",
  "xmlBase64": "...",
  "expectedXmlSha256": "64 lowercase hex characters",
  "profile": "EN16931"
}
```

Erfolg liefert `status`, `profile`, `pdfBase64`, `embeddedXmlSha256`, `validationCode` und eine begrenzte technische Zusammenfassung. Unbekannte Felder und Profile werden abgelehnt. Rechnungsinhalte, XML, PDF und Tokens werden nicht geloggt.

## Secrets und Rotation

- Generator: `EINVOICE_GENERATOR_TOKENS`, kommasepariert; erster Wert aktuell, zweiter während einer Rotation vorübergehend gültig.
- FreelanceFlow-Server: `EINVOICE_GENERATOR_URL=https://<interner-host>/v1/zugferd` und `EINVOICE_GENERATOR_TOKEN=<aktuelles-token>`.
- Keine Variable darf mit `VITE_` beginnen.

Rotation: neues Token zusätzlich am Generator hinterlegen, Generator ausrollen, Server auf das neue Token umstellen, Funktionstest durchführen und anschließend das alte Token entfernen. Der Generator vergleicht Tokens konstantzeitlich.

## Ressourcen und Grenzen

Standardwerte:

- JSON-Request: 22 MB
- dekodierte Sicht-PDF: 10 MB
- dekodiertes XML: 5 MB
- Laufzeit je Werkzeug: 40 Sekunden
- parallele Generierungen: 2
- temporärer Speicher: empfohlenes tmpfs mit 256 MB

Bei Kapazitätsüberschreitung wird `GENERATOR_BUSY`, bei Übergröße `REQUEST_TOO_LARGE` und bei Timeout `GENERATOR_TIMEOUT` ausgegeben. Temporäre Dateien werden in einem `finally`-Block nach jedem erfolgreichen oder fehlgeschlagenen Request gelöscht.

## Health, Readiness und Monitoring

- `GET /health`: Prozess-Liveness, keine Tool- oder Pfadangaben.
- `GET /ready`: prüft Tokenkonfiguration sowie intern benötigte Artefakte, gibt öffentlich nur `ready` oder `not_ready` aus.

Strukturierte Logs enthalten ausschließlich Zeitpunkt, Request-ID, Statuscode, stabilen Fehlercode und Laufzeit. Empfohlene Alarme:

- Readiness länger als zwei Minuten fehlerhaft
- Timeout- oder 5xx-Anteil über fünf Prozent in fünf Minuten
- wiederholte `VALIDATION_FAILED`- oder `EMBEDDED_XML_MISMATCH`-Ereignisse
- dauerhaft ausgeschöpfte Parallelitätsgrenze

## Updates, Rollback und Notfallabschaltung

Für Updates Toolversionen und SHA-256-Werte in einem Pull Request ändern, Image bauen, vollständige Generator- und EN16931-Tests ausführen und zunächst in Staging ausrollen. Rollback erfolgt ausschließlich auf die vorherige bekannte Image-Digest. Zur Notfallabschaltung `EINVOICE_GENERATOR_URL` im FreelanceFlow-Server entfernen oder den Generator-Netzwerkzugriff sperren; die Anwendung liefert dann einen stabilen Konfigurationsfehler und niemals eine unvalidierte PDF.

## Noch manuell erforderlich

- privates TLS-geschütztes Hosting oder internes Netzwerk bereitstellen
- Registry-Digest des freigegebenen Images pinnen
- Ressourcenlimits beim gewählten Hoster erzwingen
- Log-Drain und Alarme konfigurieren
- Token in Secret Stores beider Dienste hinterlegen
- produktiven Smoke-Test mit einer ausschließlich dafür vorgesehenen Testrechnung durchführen
