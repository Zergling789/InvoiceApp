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
- formatneutrale serverseitige Validierung von Marktumfang, Leistungsangabe, Steuerfällen und Summen als gemeinsame Grundlage für CII und später UBL
- lückenloses Laden der Marktumfangsdaten aus Rechnung und Branding-Snapshot ohne steuerlich relevante Standardwerte im Exportpfad
- authentifizierter CII-XML-Download und produktiver ZUGFeRD-Endpunkt aus dem kanonischen Modell
- verpflichtende serverseitige CII-Preflight-Validierung mit stabilem Fehlercode
- strukturierte Partei-Anschriften und elektronische Adressen in Einstellungen, Kunden- und Branding-Snapshot
- gepinnte KoSIT-XSD-/Schematron-Validierung mit SHA-256-Prüfung und CI-Job
- technisch valide PDF/A-3u-ZUGFeRD-Referenzpipeline mit Mustang und bytegenauer XML-Rückprüfung
- gebrandete Chromium-zu-PDF/A-Konvertierung über Ghostscript als reproduzierbarer CI-Pfad
- idempotenter Bootstrap für die bei einem vollständigen Supabase-Migrationslauf benötigte `set_updated_at()`-Triggerfunktion

## Teilweise umgesetzt

- Bestehende Altdaten behalten ihre erweiterten Steuerkategorien; diese bleiben lesbar, sind aber nicht neu finalisierbar.
- Angebot-zu-Rechnung übernimmt Positionen, Kunde, Projekt, Währung und Texte; rechnungsspezifische Werte werden sicher vorbelegt.

## Noch offen

- Bereitstellung und Betrieb des extern konfigurierten PDF/A-3-/EN-16931-Generator-Dienstes
- UBL-Serialisierung und Produktfluss für XRechnung
- zusätzliche internationale und besondere Umsatzsteuerfälle

## Bewusst nicht unterstützt

- B2C, Ausland, Fremdwährung, Reverse Charge, Steuerbefreiung und sonstige Nullsteuersätze
- automatische steuerliche Entscheidungen und ungeprüfte Finalisierung
