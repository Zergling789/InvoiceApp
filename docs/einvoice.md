# E-Rechnung

FreelanceFlow erzeugt strukturierte CII-Daten aus demselben kanonischen Rechnungsmodell wie die sichtbare PDF. Unterstützt wird ausschließlich ZUGFeRD 2 im Profil EN 16931 für den dokumentierten deutschen B2B-Marktumfang.

## Produktiver Export

`POST /api/einvoice/zugferd` ist authentifiziert, lädt die Rechnung ausschließlich für den angemeldeten Eigentümer und akzeptiert nur finalisierte Rechnungen. Der Server erzeugt Sicht-PDF und CII-XML aus dem eingefrorenen Rechnungssnapshot. Ein separat betriebener Generator konvertiert die Sicht-PDF nach PDF/A-3, bettet das XML ein und validiert das Ergebnis. FreelanceFlow prüft, dass der vom Generator gemeldete Hash des eingebetteten XML exakt dem gesendeten XML entspricht.

Die Generator-Laufzeit wird mit `EINVOICE_GENERATOR_URL` und dem ausschließlich serverseitigen `EINVOICE_GENERATOR_TOKEN` konfiguriert. Ohne diese Konfiguration liefert die API `EINVOICE_GENERATOR_NOT_CONFIGURED`; es gibt keinen unvalidierten Fallback. Eine Antwort gilt nur bei Status `VALID`, Profil `EN16931`, passendem XML-Hash und einem PDF-Dokument als erfolgreich.

Erfolgreiche Erzeugungen werden nicht mehrfach als Binärdatei gespeichert. Stattdessen wird die finalisierte Rechnung deterministisch neu erzeugt und in `einvoice_exports` mit Format, Profil, Version, Erzeugungszeitpunkt, Prüfergebnis und SHA-256-Inhaltshash protokolliert. Finalisierte Rechnungs- und Branding-Snapshots bleiben die reproduzierbare Datenquelle.

## Fehlercodes

- `EINVOICE_NOT_FINALIZED`
- `EINVOICE_DATA_INCOMPLETE`
- `EINVOICE_VALIDATION_FAILED`
- `EINVOICE_GENERATION_FAILED`
- `EINVOICE_GENERATION_TIMEOUT`
- `EINVOICE_GENERATOR_NOT_CONFIGURED`
- `EINVOICE_FORBIDDEN`

## Betriebsvoraussetzung

Die in CI verwendete Ghostscript-/Mustang-Pipeline weist die technische Erzeugbarkeit nach, ist aber nicht Bestandteil einer Vercel Function. Vor einer Beta muss ein isolierter Generator mit gepinnten Ghostscript-, Java-, Mustang- und Validator-Versionen bereitgestellt, über TLS erreichbar gemacht und mit dem Server-Token geschützt werden. Der produktive Dienst und seine Betriebsumgebung müssen separat überwacht und aktualisiert werden.
