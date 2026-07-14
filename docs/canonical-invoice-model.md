# Kanonisches Rechnungsmodell

`server/einvoice/canonicalInvoice.js` bildet gespeicherte Rechnung, Kunden-Snapshot und Branding-Snapshot auf eine einzige, formatneutrale Struktur ab. Dieses Modell enthält Dokumentidentität, Leistungsangabe, Verkäufer, Käufer, Zahlung, Positionen, Steueraufschlüsselung und Geldsummen.

Der PDF-Generator verwendet bereits ausschließlich einen Adapter dieses Modells. Künftige CII- und UBL-Serializer müssen dasselbe kanonische Objekt konsumieren und dürfen Summen oder Steuergruppen nicht selbst neu berechnen. So lassen sich visuelle PDF-Daten und strukturierte XML-Daten in Konsistenztests direkt vergleichen.

Das Feld `specification: EN16931_CORE` beschreibt die Zielsemantik, ist aber keine Konformitätsaussage. Formale Konformität entsteht erst nach vollständigem Mapping, XML-Schema-/Schematron-Prüfung und einem unabhängigen Validatorlauf.

## CII- und ZUGFeRD-Export

Der authentifizierte Endpunkt `POST /api/einvoice/cii` serialisiert finalisierte Rechnungsdaten als UN/CEFACT Cross Industry Invoice. `POST /api/einvoice/zugferd` erzeugt daraus über den konfigurierten, authentifizierten Generator eine validierte PDF/A-3-Hybridrechnung im Profil EN 16931. Ohne Generator-Konfiguration wird kein ZUGFeRD-Dokument ausgeliefert. Beide Exporte verwenden dasselbe kanonische Objekt wie die PDF-Darstellung.

Vor der Serialisierung erzwingt `canonicalValidation.js` die formatneutralen fachlichen Regeln. `ciiValidation.js` übersetzt deren Ergebnis in den CII-spezifischen Fehler `CII_PREFLIGHT_FAILED`. Fehlende Parteien, Anschriften oder Steueridentifikation, ungültige Leistungsangaben, nicht unterstützte Steuern und inkonsistente Summen verhindern damit den Export. `npm run test:einvoice` führt die zugehörigen Modell-, Konsistenz-, Serializer- und Negativtests aus.

Verkäufer und Käufer besitzen zusätzlich strukturierte Felder für Straße, Hausnummer, Postleitzahl, Ort und elektronische Adresse samt Scheme-ID. Käuferwerte werden beim Speichern aus dem Kundenstamm in die Rechnung kopiert; Verkäuferwerte werden bei der Finalisierung gemeinsam mit dem Branding eingefroren.

Marktumfangsdaten werden nicht still vorbelegt. Verkäuferland, Kundenland, Kundentyp und Leistungsland müssen aus dem eingefrorenen Rechnungsdatensatz beziehungsweise Branding-Snapshot stammen. Fehlen sie, blockiert der serverseitige Preflight den strukturierten Export. Das kanonische Modell führt außerdem Rechnungsart, Zahlungsziel und Fälligkeit formatneutral, damit spätere CII- und UBL-Serializer dieselben Werte verwenden.

Ein Neuaufbau der Supabase-Datenbank erhält mit `20260710073509_bootstrap_set_updated_at.sql` die von späteren Sicherheitsmigrationen erwartete Triggerfunktion, ohne bereits angewendete Migrationen nachträglich zu verändern.

## Externe Validierung

`npm run validate:kosit` lädt den KoSIT Validator 1.6.2 und die XRechnung-Konfiguration 2026-01-31 für XRechnung 3.0.2 in `.cache/kosit`. Beide Downloads sind mit fest hinterlegten SHA-256-Prüfsummen abgesichert. Eine aus dem Produkt-Serializer erzeugte EN-16931-CII-Referenzrechnung muss XSD und Schematron mit `ACCEPTABLE` bestehen. Der gleiche Lauf ist als eigener CI-Job eingerichtet.

`npm run validate:zugferd` lädt Mustang CLI 2.24.0 mit gepinnter SHA-256-Prüfsumme. Der Lauf erzeugt eine PDF/A-3u-Referenz, bettet das kanonische XML im Profil EN16931 ein, validiert PDF und XML gemeinsam und extrahiert das XML anschließend erneut. Die extrahierte Datei muss bytegenau mit der kanonischen Quelldatei übereinstimmen. Mustangs generische Sichtdarstellung ist nur eine technische Referenz und wird wegen ihres nicht gebrandeten Layouts nicht als Produktdownload angeboten.

`npm run validate:zugferd:branded` erzeugt die bestehende FreelanceFlow-Sicht-PDF mit Chromium, konvertiert sie mit Ghostscript 10.x nach PDF/A-3, bettet anschließend dasselbe XML mit Mustang ein und wiederholt die vollständige Hybrid- und Bytegleichheitsprüfung. Ghostscript wird über `GHOSTSCRIPT_BIN` oder den Systempfad gefunden. CI installiert Ghostscript paketverwaltet; die Anwendung führt keine automatische Systeminstallation durch.
