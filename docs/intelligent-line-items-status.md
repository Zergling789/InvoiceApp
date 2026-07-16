# Status: Intelligente Positionen

## Vollständig umgesetzt

- Vorschlagssuche aus Produkt-/Leistungskatalog sowie früheren Angebots- und Rechnungspositionen
- nachvollziehbares Ranking nach Texttreffer, Häufigkeit, Kundenbezug und Aktualität
- Tippfehler- und Wortstammerkennung, Deduplizierung und Tastatursteuerung
- Katalogverwaltung und speicherbare Positionsgruppen mit Auswahl vor Übernahme
- KI-Mehrfachvorschau mit Auswahl, Bearbeitung und Entfernung einzelner Positionen
- serverseitig strukturiertes KI-Schema; keine direkten KI-Datenbankänderungen
- Preise nur aus serverseitig ermittelten Katalog-/Historiendaten; sonst Pflichtprüfung
- RLS, Eigentümerprüfung und additive Migrationen für alle neuen Tabellen
- deterministische Nutzungsereignisse für spätere Ranking-Verbesserungen

## Teilweise umgesetzt

- Semantische Beziehungen werden durch Wortstamm-/Fehlertoleranz und die KI-Vorschau unterstützt. Ein eigener Embedding-Index ist bewusst noch nicht eingeführt.
- Preisänderungs- und Verwerfungsereignisse sind modelliert; eine automatische Differenzanalyse beim späteren Dokumentspeichern ist noch offen.

## Bewusst nicht unterstützt

- automatisch erfundene oder als sicher dargestellte Preise
- ungeprüfte direkte Übernahme von KI-Ausgaben
- autonomes oder nicht nachvollziehbares selbstlernendes Ranking
- direkte Schreibzugriffe des KI-Modells auf die Datenbank

## Nächster sinnvoller Ausbau

- synonymbasierte Fachwortlisten je Branche und optional kontrollierte, mandantengetrennte semantische Suche
- komfortabler Gruppen-Editor mit Sortierung
- Auswertung von Preisänderungs- und Verwerfungsereignissen im Ranking
