# Status: steuerliches Rechnungsmodell und Marktumfang

## Vollständig umgesetzt

- Leistungsdatum oder vollständiger Leistungszeitraum im Formular-, Speicher-, Lade-, PDF- und Finalisierungspfad
- DB-seitige Marktbegrenzung auf DE/B2B/DE/EUR
- DB-seitige Steuerbegrenzung auf STANDARD 19 %, REDUCED 7 % und SMALL_BUSINESS 0 %
- getrennte Steuernummer und USt-ID mit rückwärtskompatibler Übernahme von `tax_id`
- optionale Buyer Reference in Datenbank, Editor, Repository und PDF
- verpflichtender Hinweis im Finalisierungsdialog
- formatneutrales kanonisches Rechnungsmodell als gemeinsame Quelle für PDF und spätere XML-Exporte
- zentrale Ableitung von Rechnungspositionen, Steuergruppen und Geldsummen im Server
- authentifizierter CII-XML-Vorabexport aus dem kanonischen Modell
- verpflichtende serverseitige CII-Preflight-Validierung mit stabilem Fehlercode
- strukturierte Partei-Anschriften und elektronische Adressen in Einstellungen, Kunden- und Branding-Snapshot
- gepinnte KoSIT-XSD-/Schematron-Validierung mit SHA-256-Prüfung und CI-Job
- technisch valide PDF/A-3u-ZUGFeRD-Referenzpipeline mit Mustang und bytegenauer XML-Rückprüfung

## Teilweise umgesetzt

- Bestehende Altdaten behalten ihre erweiterten Steuerkategorien; diese bleiben lesbar, sind aber nicht neu finalisierbar.
- Angebot-zu-Rechnung übernimmt Positionen, Kunde, Projekt, Währung und Texte; rechnungsspezifische Werte werden sicher vorbelegt.

## Noch offen

- CII-Serialisierung für ZUGFeRD und UBL-Serialisierung für XRechnung
- unabhängige EN-16931-/XRechnung-Validierung und PDF/A-3-Einbettung
- zusätzliche internationale und besondere Umsatzsteuerfälle

## Bewusst nicht unterstützt

- B2C, Ausland, Fremdwährung, Reverse Charge, Steuerbefreiung und sonstige Nullsteuersätze
- automatische steuerliche Entscheidungen und ungeprüfte Finalisierung
