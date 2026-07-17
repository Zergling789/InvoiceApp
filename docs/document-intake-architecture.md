# Dokument-Intake: Architekturstand

## Ziel

FreelanceFlow verwendet KI ausschließlich, um einen bearbeitbaren Dokumententwurf vorzubereiten. Die KI speichert, versendet oder finalisiert kein Dokument und entscheidet weder über Preise noch über Steuern. Der Nutzer prüft jede vorgeschlagene Position vor der Übernahme.

## Gemeinsamer Ablauf

1. Ein quellenspezifischer Adapter prüft Dateityp, Größe und Inhalt.
2. Der Adapter erzeugt eine begrenzte, normalisierte Eingabe für den Dokumententwurf.
3. Der Server erzeugt daraus ausschließlich strukturierte Positionen und Texte.
4. Preise werden deterministisch aus dem eigenen Katalog oder der eigenen Historie ergänzt; ohne Treffer bleibt der Preis prüfpflichtig.
5. Die App validiert den versionierten Response erneut und zeigt eine bearbeitbare Vorschau.
6. Erst eine ausdrückliche Nutzeraktion übernimmt ausgewählte Positionen in den lokalen Editorzustand.
7. Speichern, steuerliche Validierung, Finalisierung und Versand bleiben in den bestehenden fachlichen Services und Datenbankfunktionen.

Der stabile Endpunkt ist `POST /api/ai/document-draft`, aktuell mit Vertragsversion `1`. Der bisherige Endpunkt `/api/ai/invoice-draft` bleibt vorerst als kompatibler Alias erhalten.

## Quellenstatus

| Quelle | Status | Ziel und Grenze |
| --- | --- | --- |
| Text | unterstützt | Vom Nutzer eingegebene Leistungsbeschreibung; maximal 4.000 Zeichen |
| Visitenkartenbild | teilweise unterstützt | Erzeugt ausschließlich einen bearbeitbaren Kundenentwurf, keine Dokumentpositionen |
| Sprache/Transkript | vorbereitet, blockiert | Noch keine Audioaufnahme, Übertragung oder Transkription |
| Baustellenfoto | vorbereitet, blockiert | Noch keine Ableitung von Mengen oder Leistungen aus Bildern |
| PDF | vorbereitet, blockiert | Noch kein Upload und keine Extraktion fremder Dokumente |
| Rapport | vorbereitet, blockiert | Noch kein eigenes Rapportmodell und keine automatische Übernahme |

Bekannte, aber nicht freigeschaltete Quellen liefern `AI_SOURCE_NOT_SUPPORTED`. Unbekannte Quellen liefern `AI_SOURCE_INVALID`. Dadurch kann keine neue Eingabeart versehentlich ohne passende Datenschutz-, Größen-, Sicherheits- und Qualitätsschranken aktiviert werden.

## Verbindliche Grenzen

- Keine Kundennamen, Adressen, E-Mails, Bank- oder Steuerdaten im freien Text.
- Keine direkten Datenbankzugriffe durch das Modell.
- Keine erfundenen Preise; nur exakte IDs serverseitig ermittelter Preiskandidaten sind zulässig.
- Steuerkategorie und Steuersatz aus KI-Ausgaben werden bei der Übernahme verworfen und durch die Editorregeln gesetzt.
- Keine automatische Speicherung, Finalisierung, Versendung oder rechtliche beziehungsweise steuerliche Bewertung.
- Providerzugangsdaten bleiben serverseitig. Prompts, Bilder und Dokumentinhalte gehören nicht in Standardlogs.
- Ungültige Eingaben verbrauchen kein KI-Kontingent.

## Voraussetzungen für eine weitere Quelle

Vor der Aktivierung müssen Eingabeformat, MIME-Typen, Größenlimit, Timeout, Aufbewahrung, Löschung, Providerregion, AVV, Rate Limit und Kostenlimit festgelegt sein. Zusätzlich sind Prompt-Injection-Schutz für eingebettete Texte, ein strikt versioniertes Ausgabeschema, eine bearbeitbare Vorschau und automatisierte Missbrauchs- sowie Mandantentrennungstests erforderlich. Große Dateien benötigen gegebenenfalls einen separaten, abbrechbaren Hintergrundprozess; sie dürfen nicht stillschweigend in den synchronen Textendpunkt aufgenommen werden.

## Noch offen

- Nutzerseitige, widerrufbare Aktivierung der optionalen KI-Verarbeitung und die dafür festgelegte Rechtsgrundlage.
- Anbieterbezogene Regionen, Löschfristen und Transfermechanismen.
- Fachliches Datenmodell für Rapporte.
- Datenschutz- und Sicherheitskonzept für Audio-, Foto- und PDF-Dateien.
