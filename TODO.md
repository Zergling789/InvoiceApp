## TODO / Plan

Priorität: P1 (kritisch), P2 (sollte), P3 (kann).

1. ✅ **P1 – Routing reparieren & Feature-Komponenten füllen:** Die Pages-Implementierungen (Dashboard, Clients, Projects) nach `src/features/*` übernehmen oder sauber re-exportieren, sodass `App.tsx` wieder funktionierende Routen liefert. Kurzer Smoke-Test (Build) nachziehen.
2. ✅ **P1 – Settings-UI umsetzen:** In `src/features/settings/SettingsView.tsx` eine Maske bauen, die `dbGetSettings` lädt, alle `UserSettings`-Felder bearbeitbar macht, validiert und über `dbSaveSettings` speichert; Fehlerzustände anzeigen.
3. ✅ **P1 – Kunden-UX abrunden:** Durchsuchbare, mobil nutzbare Kundenkarten, hilfreiche Lade-/Fehler-/Leerzustände und eine eigene Bearbeitungsseite. Vor- und Nachname sind Pflicht; die Firma bleibt optional. Erweiterte Angaben bleiben eingeklappt.
4. ✅ **P1 – Projects-UX abrunden:** Feature-Komponente mit Supabase-Interaktion (Listen/Anlegen) inkl. humanisierter Fehlertexte fertigstellen; Validierungen für Name/Client/Budgets.
5. ✅ **P1 – Einstellungen vereinfachen:** Lange Einstellungsseite in die Bereiche Firma & Steuer, Dokumente, E-Mail sowie Konto & Datenschutz aufteilen. Ladefehler bleiben fail-safe und können erneut versucht werden, ohne gespeicherte Werte durch leere Standards zu überschreiben.
6. ✅ **P1 – Dokumentdetails fokussieren:** Aktionen folgen dem nächsten Arbeitsschritt (finalisieren, senden, bezahlen oder umwandeln), mobile Aktionsbuttons bleiben gut erreichbar und Ladefehler bieten einen sicheren Retry sowie den Rückweg zur Übersicht.
7. ✅ **P1 – Empfängerportal vereinfachen:** Deutsche Datums- und Positionsdarstellung, mobile Entscheidungsbuttons, verständliche Ladefehler mit Retry sowie klar getrennte Bestätigungen für Annahme und Ablehnung.
8. ✅ **P1 – Produkte & Leistungen abrunden:** Verständliche Bezeichnungen ohne „Eintrag“, Suche über Name, Kategorie und Produktnummer, sichere Lade-/Retry-Zustände sowie klare mobile Aktionen und Paket-Leerzustände.

**Master-Roadmap Phase 1 abgeschlossen:** Die priorisierten UX-Bereiche Navigation, Dokumentübersicht, Dokumenteditor, Dokumentdetails, Kunden, Projekte, Einstellungen, Produkte & Leistungen und Empfängerportal wurden vereinfacht und mit Regressionstests abgesichert. Weitere Detailverbesserungen bleiben möglich, blockieren aber nicht den Start von Phase 2.
5. ✅ **P2 – Dokumenten-Flows absichern:** Fehlermeldungen im Offer/Invoice-Editor/List klarer machen (z. B. bei fehlenden Settings/DueDate), und sicherstellen, dass Readonly-Ansicht & Print-Start robust bleiben.
6. ✅ **P2 – Hilfs-Layer auffüllen:** Leere Utilities (`src/lib/env.ts`, `assert.ts`, `format.ts`) und `src/components/EmptyState.tsx` mit sinnvollen Helfern bestücken oder entfernen, sofern nicht benötigt; Konsumenten anpassen.
7. ✅ **P3 – Styles & DX:** Gemeinsame Basis-Styles (`src/styles/index.css`) anbinden, README-Kurznotiz zu Setup/ENV ergänzen.

Abschlusskriterium: Alle Routen laufen, Settings bearbeitbar, Angebote/Rechnungen editier-/druckbar, Build ohne Fehler.

## Master-Roadmap Phase 2 – Onboarding

1. ✅ **Willkommen & Fortschritt:** Neue Nutzer werden nach Login und rechtlicher Zustimmung durch eine kurze, fortsetzbare Einrichtung geführt. Bestehende Konten werden durch die Migration nicht nachträglich blockiert.
2. ✅ **Firmendaten:** Absendername, Betrieb, E-Mail und deutsche Anschrift werden mit Registrierungsdaten vorbelegt und über den bestehenden Einstellungsdienst gespeichert.
3. ✅ **Steuer:** Regelbesteuerung oder Kleinunternehmerregelung wird verständlich abgefragt. Mindestens Steuernummer oder USt-IdNr. ist erforderlich; Währung und Marktumfang bleiben auf Deutschland/EUR begrenzt.
4. ✅ **Erster Kunde:** Der bestehende, vereinfachte Kundendialog wird wiederverwendet. Der neu angelegte Kunde wird automatisch für den nächsten Schritt übernommen.
5. ✅ **Erstes Angebot:** Der vorhandene Angebots-Wizard startet mit ausgewähltem Kunden. Erst das erfolgreiche Speichern schließt das Onboarding ab.
6. ✅ **Sicherheit & Wiederaufnahme:** Fortschritt und Kundenbezug liegen RLS-geschützt in `user_settings`; direkte App-Routen leiten unvollständig eingerichtete neue Konten zurück in den passenden Ablauf.

**Master-Roadmap Phase 2 umgesetzt:** Der vollständige Kernablauf Willkommen → Betrieb → Steuer → Kunde → Angebot → Fertig ist implementiert und automatisiert getestet. Die additive Onboarding-Migration ist im Test- und Produktivprojekt angewendet.

## Master-Roadmap Phase 3 – Mobiler Workflow

1. ✅ **Sichtbarer Mobil-Viewport:** Vollbilddialoge verwenden die tatsächlich sichtbare Browserhöhe. Adressleiste, Safe Area und eingeblendete Bildschirmtastatur verdecken dadurch keine Dialogbereiche mehr.
2. ✅ **Mobile Dialogaktionen:** Dokumentversand, KI-Entwurf, Visitenkartenerkennung, Produkt-/Leistungseditor und Bestätigungen ordnen Hauptaktionen auf kleinen Displays vollbreit und gut erreichbar an.
3. ✅ **Dokument-Wizard:** Der scrollbare Arbeitsbereich reserviert Platz für die Bildschirmtastatur; die Navigation der Vorschau bricht auf Smartphones in eindeutige, vollbreite Aktionen um.
4. ✅ **Dokumentdetails:** Die öffentliche mobile Angebotsansicht ist bei 390 × 844 Pixeln ohne horizontalen Seiten-Scroll automatisiert geprüft und bis zu den Aktivitäten bedienbar.
5. ✅ **Authentifizierter Rechnungsflow vorbereitet:** Ein dedizierter Smartphone-E2E-Test deckt Kunde anlegen → Rechnung erstellen → speichern → Dokumentliste neu laden → öffnen → finalisieren einschließlich Datenbankstatus und Sperre ab. Er läuft ausschließlich mit den getrennten Supabase-E2E-Secrets in GitHub CI.
6. ✅ **Weitere mobile Arbeitsflächen:** PDF-Vorschau, Paketwahl, Paketeditor, To-do-Schnellmenü und mobile Hauptnavigation verwenden ebenfalls den sichtbaren Viewport und Safe-Area-Abstände.
7. ⏳ **Noch offen:** Den neuen authentifizierten Test nach dem gebündelten Push in GitHub CI erfolgreich ausführen und ergänzende Gerätekontrollen mit tatsächlich geöffneter virtueller Tastatur auf iOS und Android durchführen.

**Phase 3 weitgehend umgesetzt:** Das systemweite mobile Fundament, der öffentliche Dokumentworkflow und der authentifizierte Rechnungsworkflow sind implementiert. Der Abschluss hängt noch von der Ausführung des neuen Supabase-E2E-Tests in GitHub CI und den realen iOS-/Android-Tastaturkontrollen ab.

## Master-Roadmap Phase 4 – Dokumentenworkflow

1. ✅ **Ein klarer nächster Schritt:** Angebot und Rechnung leiten aus ihrem fachlichen Status genau eine hervorgehobene Hauptaktion ab. Finalisieren, senden, Zahlung erfassen, mahnen, Empfänger-Link teilen und aus einem angenommenen Angebot eine Rechnung erstellen folgen derselben zentralen Statuslogik.
2. ✅ **Statuswechsel verständlich bestätigen:** Manuell erfasste Angebotsannahmen und -ablehnungen werden ausdrücklich als Rückmeldungen außerhalb des Empfängerportals beschrieben. Zahlung, Storno und Angebot-zu-Rechnung-Konvertierung erklären vorab ihre konkrete Folge.
3. ✅ **Doppelte Aktionen vermeiden:** Laufende Statuswechsel, Downloads und Link-Erzeugungen sperren die Dokumentaktionen vorübergehend, damit ein mehrfaches Tippen keine doppelten Vorgänge auslöst.
4. ✅ **Angebotsrückmeldungen vollständig abbilden:** Gesendete Angebote können neben der Antwort im Empfängerportal auch manuell als angenommen oder abgelehnt markiert werden. Statuswechsel und fachliche Aktivität werden atomar durch eine eigentümergebundene `security invoker`-Funktion gespeichert; der Zeitpunkt bleibt in der Dokumentdetailansicht sichtbar.
5. ✅ **Angebot in Rechnung übernehmen:** Ausschließlich angenommene Angebote erzeugen serverseitig einen neuen Rechnungsentwurf und übernehmen Kunde, Positionen und Konditionen. Direkte RPC-Aufrufe für nur gesendete, fremde oder bereits umgewandelte Angebote werden stabil blockiert. Die Konvertierung läuft mit den RLS-Rechten des angemeldeten Nutzers.
6. ⛔ **Bewusst noch nicht unterstützt – Gutschrift:** Es existiert noch kein vollständiges Datenmodell mit eigener Nummerierung, Statuslogik, PDF-Ausgabe und steuerlicher Validierung. Ein Rechnungsstorno erzeugt deshalb ausdrücklich keine Gutschrift. Dieser Prozess wird erst als eigener, zusammenhängender Meilenstein umgesetzt.
7. ✅ **Versandaktionen vereinheitlichen:** Standardversand, Zahlungserinnerung, Mahnung und Angebotsnachfrage besitzen eindeutige Titel, Aktions- und Erfolgstexte. Rechnungsentwürfe zeigen keinen wirkungslosen direkten Senden-Button mehr; `Finalisieren & senden` validiert den finalisierten Zustand korrekt und verhindert doppelte Ausführungen.
8. ✅ **Versandfehler ohne Doppelsenden:** SMTP-Verbindungen besitzen feste Verbindungs-, Begrüßungs- und Socket-Timeouts. Nur ein eindeutig vor dem Versand auftretender PDF-Engine-Reset wird automatisch wiederholt. Bei Netzwerk- oder SMTP-Timeouts zeigt die App dauerhaft „Versandstatus prüfen“ und blockiert einen vorschnellen zweiten Versand. Wurde die Nachricht bereits vom Mailserver angenommen, aber die Statusaktualisierung schlägt fehl, wird dies als eigener maschinenlesbarer Zustand gemeldet.
9. ⏳ **Noch offen:** Den aktualisierten authentifizierten Angebot-zu-Rechnung-Ablauf nach dem gebündelten Push mit den GitHub-E2E-Secrets ausführen und die reale E-Mail-Zustellung prüfen. Zustellbestätigungen und spätere Bounces sind mit dem derzeit providerunabhängigen SMTP-Versand nicht zuverlässig erkennbar; dafür ist später eine gezielte Provider-Webhook-Integration erforderlich.

**Phase 4 weitgehend umgesetzt:** Der Kernablauf für Angebote und Rechnungen ist vereinheitlicht und gegen Fehlbedienung sowie versehentlichen Doppelversand abgesichert. Der bewusste Ausschluss von Gutschriften verhindert, dass ein fachlich unvollständiger Prozess als marktreif erscheint. Offen bleiben reale Provider-Zustelltests und die spätere Entscheidung für eine Bounce-Webhook-Integration.

## Master-Roadmap Phase 5 – KI vorbereiten

1. ✅ **Ein gemeinsamer Dokument-Intake:** Der allgemeine Endpunkt `/api/ai/document-draft` ersetzt die rechnungsspezifische Benennung. Der bisherige Endpunkt bleibt als kompatibler Alias bestehen.
2. ✅ **Versionierter Vertrag:** Anfragequelle und strukturierte Antwort besitzen einen expliziten Vertrag. Der Browser validiert die Serverantwort zur Laufzeit, bevor Daten in die Vorschau gelangen.
3. ✅ **Quellen fail-closed vorbereiten:** Text ist die einzige freigeschaltete Dokumentquelle. Sprache, Foto, Visitenkarte, PDF und Rapport sind benannt, werden ohne eigenen sicheren Adapter jedoch mit stabilen Fehlercodes blockiert.
4. ✅ **Menschliche Prüfung bleibt Pflicht:** KI-Ergebnisse gelangen ausschließlich in die bearbeitbare Auswahlvorschau. Preise kommen nur aus eigenen verlässlichen Quellen; Steuerwerte werden durch die bestehenden Editorregeln ersetzt.
5. ✅ **Ungültige Eingaben nicht berechnen:** Text- und Visitenkarteneingaben werden vor dem Verbrauch des KI-Kontingents validiert.
6. ✅ **Ausbaugrenzen dokumentiert:** Datenfluss, Sicherheitsgrenzen und Voraussetzungen für Audio-, Bild-, PDF- und Rapportadapter sind in `docs/document-intake-architecture.md` festgehalten.
7. ⏳ **Vor Public Beta offen:** Widerrufbare KI-Aktivierung und Rechtsgrundlage sowie providerbezogene Regionen, Löschfristen und Transfermechanismen festlegen. Diese Produkt-/Datenschutzentscheidung wird nicht durch einen stillen technischen Standard vorweggenommen.

**Phase 5 technisch umgesetzt:** Die Architektur kann zusätzliche Quellen aufnehmen, ohne Generator, Editor oder fachliche Speicherung miteinander zu vermischen. Es wurden bewusst weder Chatbot noch automatische Steuer-, Preis-, Speicher- oder Finalisierungsfunktionen ergänzt.

## Master-Roadmap Phase 6 – Produktionsreife

1. ✅ **Abgelaufene Sessions zentral behandeln:** Authentifizierte HTTP-401-Antworten beenden die lokale Sitzung und führen mit einer verständlichen Meldung zur Anmeldung. Netzwerkfehler bei der anfänglichen Sitzungsprüfung bleiben wiederholbar und löschen die Sitzung nicht vorschnell.
2. ✅ **API-Aufrufe zeitlich begrenzen:** Normale Browser-API-Aufrufe besitzen einen festen Timeout und stabile Codes für Timeout, nicht erreichbaren Server und Offlinezustand. Nutzer werden bei unklarem Aktionsstatus vor blindem Wiederholen gewarnt.
3. ✅ **Netzwerkzustand sichtbar machen:** Ein globaler Hinweis zeigt fehlende Internetverbindung und die Wiederherstellung an, ohne einen nicht vorhandenen Offline-Speichermodus zu versprechen.
4. ✅ **Sackgassen und unbekannte Fehler behandeln:** Öffentliche und geschützte unbekannte Routen zeigen eine echte 404-Seite mit sicheren Rückwegen. Nicht abgefangene Browser- und React-Fehler erhalten eine sichtbare Fehler-ID und werden ohne Fehlermeldung, Stacktrace oder fachliche Inhalte an den Server gemeldet.
5. ✅ **Ladefehler ohne Sackgasse:** Dashboard, Dokumente, To-dos, Aktivitäten, Dokumenterstellung und -bearbeitung, Tarifstatus und Projektanlage zeigen keine falschen Leerzustände oder technischen Rohmeldungen. Jeder kritische Ladefehler besitzt einen sicheren Wiederholungsweg; zustandsverändernde Aktionen bleiben bis zu verlässlichen Daten gesperrt.
6. ⛔ **Betrieblich blockiert:** Externen Monitoring-/Log-Drain, Alarmempfänger, Backup-Zeitplan und einen dokumentierten Restore-Test in einem ausdrücklich isolierten Projekt einrichten und nachweisen. Runbook und Protokollvorlage existieren; ohne freigegebenen Anbieter, Alarmempfänger und isoliertes Restore-Ziel darf dieser Nachweis nicht vorgetäuscht oder gegen Produktion ausgeführt werden.

**Phase 6 technisch weitgehend umgesetzt:** Server-Request-IDs, redigierte strukturierte Logs, Liveness/Readiness, Incident-Dokumentation, Session-, Timeout-, Offline-, 404-, globale Browserfehler- und zentrale Ladefehlerbehandlung sind umgesetzt. Der produktive Betriebsnachweis bleibt bewusst blockiert, bis externe Infrastruktur und ein isoliertes Restore-Ziel festgelegt sind.

## Master-Roadmap Phase 7 – Marktreife

1. ✅ **Verständliche Produktsprache:** Sichtbare Begriffe wie „Follow-up“, „Draft“, „Preview“, „Locked“, „Positionsgruppe“, „Branding“, „Tags“ und „Checkout“ wurden in den betroffenen Kernabläufen durch verständliche deutsche Bezeichnungen ersetzt.
2. ✅ **Keine technischen Rohdaten im Fehlerpfad:** Ungültige Serverantworten geben weder Antwortinhalt noch HTML-Fragmente an die Oberfläche weiter. Diagnoseausgaben der Dokumentzustellung enthalten keine rohen Dokument- oder Benutzer-IDs; ungefilterte Browser-Konsolenfehler in den Einstellungen sind auf den Entwicklungsmodus begrenzt.
3. ✅ **Kernaktionen visuell vereinheitlicht:** Mobile Erstellen-Aktionen, Dokumenteditor, Dokumentkarten und der Bereich „Mehr“ verwenden die gemeinsamen Farb-, Fokus- und Oberflächenvariablen statt abweichender Indigo-/Blauwerte.
4. ⏳ **Als Nächstes:** Dialoggrößen, Formabstände, Statusfarben und Aktionsbezeichnungen im vollständigen visuellen Seitenaudit weiter vereinheitlichen; anschließend reale Hell-/Dunkel- und Smartphone-Screenshots vergleichen.

**Phase 7 begonnen:** Der erste Konsistenzblock entfernt technische Sprache und riskante Debugausgaben aus den wichtigsten Nutzerwegen. Der vollständige visuelle Audit ist noch nicht abgeschlossen.

## Master-Roadmap Phase 8 – Performance

1. ✅ **Routen bedarfsgerecht laden:** Öffentliche Seiten und geschützte Arbeitsbereiche werden per `React.lazy` erst geladen, wenn sie tatsächlich aufgerufen werden. Der rund 93 kB große Dokumenteditor gehört nicht mehr zum initialen Bundle.
2. ✅ **Stabile Browser-Caches:** React, Supabase und die verwendeten Icons liegen in getrennten Vendor-Chunks. Unveränderte Bibliotheken können dadurch über neue App-Releases hinweg im Browser-Cache bleiben.
3. ✅ **Bundle-Regressionen blockieren:** Der Produktionsbuild erzeugt ein Vite-Manifest und prüft feste Budgets für initiales JavaScript, CSS und den größten Einzel-Chunk. Ein Überschreiten lässt den Build und damit CI fehlschlagen.
4. ✅ **Dokumentübersicht schlanker laden:** Statt vollständiger Kundenakten mit rund 40 Feldern lädt die Dokumentübersicht nur ID, Firma sowie Vor- und Nachname beziehungsweise Kontaktperson. RLS und der Eigentümerfilter bleiben unverändert aktiv.
5. ✅ **Dokumentlisten ruhig halten:** Tabellen- und Mobilzeilen liegen in einer memoisierten Ergebniskomponente. Sucheingaben und geöffnete Filtermenüs bauen eine unveränderte Dokumentliste dadurch nicht mehr vollständig neu auf.
6. ✅ **Seltene Editorfunktionen nachladen:** Versand, KI-Entwurf und Paketauswahl werden erst beim Öffnen geladen. Der Editor-Transfer sinkt dadurch um rund 15 Prozent, die Dokumentdetailseite um rund 12 Prozent.
7. ✅ **Doppelte Berechnungen entfernen:** Der Dokumenteditor berechnet Summen und Steuergruppen in einem gemeinsamen Durchlauf statt zweimal pro Positionsänderung.
8. ✅ **Routenbudgets ergänzen:** CI begrenzt neben dem initialen Bundle nun auch die Übertragungsgröße der Dokumentübersicht, Dokumentdetailseite und Rechnungserstellung.
9. ✅ **Dokumente mit Cursor laden:** Angebote und Rechnungen werden in stabil sortierten Seiten über `created_at` plus ID geladen. Ein sichtbares „Weitere Dokumente laden“ ergänzt den Bestand ohne Duplikate; Suche und Statusfilter warten auf alle noch fehlenden Seiten, damit keine falschen Teilergebnisse erscheinen.
10. ✅ **Sortierabfragen indizieren:** Zusammengesetzte Indizes auf Nutzer, Erstellzeitpunkt und ID bedienen Eigentümerfilter, Sortierung und Cursor gemeinsam. Der E2E-Abfrageplan verwendet dafür einen Index-Only-Scan.
11. ⏳ **Als Nächstes:** Kunden- und Projektlisten ebenfalls per Cursor paginieren, Dokumentfilter direkt in die Datenbankabfrage verschieben und die großen Einstellungs- und Editorbereiche anhand realer Nutzungsprofile weiter aufteilen.

**Phase 8 fortgeführt:** Das initiale JavaScript bleibt rund 39 Prozent kleiner. Zusätzlich sinkt der JavaScript-Transfer der Rechnungserstellung von rund 44,3 KiB auf 37,6 KiB gzip und der Dokumentdetailseite von 28,4 KiB auf 24,9 KiB gzip. Die Dokumentübersicht ist nun cursor-paginiert; Pagination für Kunden und Projekte bleibt offen.
