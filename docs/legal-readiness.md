# Rechtstexte und Zustimmungsnachweise

## Technisch umgesetzt

- Öffentliche Routen für Impressum, Datenschutzerklärung, Nutzungsbedingungen, AVV-Entwurf, Unterauftragnehmer, KI-Hinweise und Kontakt
- zentrale validierte Betreiberkonfiguration; Vercel-Produktions-Builds brechen bei fehlenden Pflichtangaben ab
- gemeinsamer Footer auf öffentlichen Seiten sowie Links in Einstellungen und Tarifseite
- Aktive Pflichtbestätigung bei der Registrierung
- Zugriffssperre für angemeldete Nutzer ohne Zustimmung zu den aktuellen Dokumentversionen
- Unveränderlicher, serverseitig geschriebener Nachweis pro Nutzer, Dokumenttyp und Version
- SHA-256-Kennung des freigegebenen Dokumentstands, Zeitpunkt und Request-ID
- RLS-geschützter Lesezugriff ausschließlich auf eigene Nachweise; keine direkten Client-Schreibrechte

Aktuelle technische Version für Nutzungsbedingungen und Datenschutzerklärung: `2026-07-14`. Der Nachweis enthält den SHA-256-Hash des zentral definierten veröffentlichten Textstands; ältere Nachweise bleiben unverändert erhalten und erfüllen die neue Version nicht.

## Vor öffentlichem Betrieb zwingend offen

Die enthaltenen Texte sind Produktentwürfe und keine abschließend geprüften Rechtstexte. Der Betreiber muss mindestens ergänzen und fachlich prüfen lassen:

- vollständige Anbieter- und Kontaktangaben im Impressum
- Rechtsform, Vertretungsberechtigte, Register- und Steuerangaben, soweit einschlägig
- Verantwortlicher und Kontakt für Datenschutzanfragen
- tatsächliche Auftragsverarbeiter, Verarbeitungsorte und Übermittlungsgrundlagen
- konkrete Zwecke, Rechtsgrundlagen, Lösch- und Aufbewahrungsfristen
- Vertragslaufzeit, Kündigung, Verfügbarkeit, Support, Haftung und Zahlungsregeln
- Versionierung und erneute Zustimmung nach jeder zustimmungspflichtigen Änderung

Der Quellcode darf bis zu dieser Vervollständigung nicht als Nachweis rechtlicher Konformität beschrieben werden.

Eine getrennte, widerrufbare KI-Einstellung ist noch nicht vollständig umgesetzt. Bis dahin darf eine AGB-Zustimmung nicht als freiwillige KI-Einwilligung ausgelegt werden; die KI-Funktionen benötigen vor öffentlichem Betrieb eine festgelegte Rechtsgrundlage und Deaktivierungsmöglichkeit.
