# Datenexport

Authentifizierte Nutzer können unter „Einstellungen → Account und Daten“ einen synchronen ZIP-Export anfordern. Der Server verwendet ausschließlich die aus dem verifizierten Access Token abgeleitete Nutzer-ID und filtert jede Datenquelle explizit nach ihrem Eigentümerfeld.

Das Archiv enthält ein versioniertes Manifest, eine Formatbeschreibung, Profildaten sowie JSON- und CSV-Dateien für Einstellungen, Kunden, Projekte, Angebote, Rechnungen, Aktivitäten, Absenderidentitäten, Audit-Ereignisse, E-Rechnungsmetadaten, Empfängerportal, Stripe-Abonnement, Tarifnutzung, Zustimmungsnachweise und Löschaufträge. CSV-Zellen mit Formelpräfix werden neutralisiert. Binäre Dokumente werden derzeit nicht zusätzlich dupliziert; das Manifest weist dies mit `binariesIncluded: false` ausdrücklich aus.

Der Export wird im Arbeitsspeicher erzeugt, unmittelbar als `application/zip` ausgeliefert, mit `Cache-Control: private, no-store` markiert und nicht in einem öffentlichen Storage-Bucket gespeichert. Die Route ist rate-limitiert; Dateipfade werden ausschließlich aus serverseitigen Konstanten erzeugt.

## Noch offen

PDF-Rechnungen, ZUGFeRD-Dateien, CII-XML und Angebots-PDFs sowie ein skalierbarer asynchroner Export mit privatem Storage, gehashtem Einmal-Token, Ablauf, automatischer Löschung und Parallelitätsgrenze sind noch nicht implementiert. Bis dahin ist der synchrone Export für große Accounts nicht als vollständig zu bewerten und darf nicht durch einen scheinbar asynchronen Prozess ohne sichere Token-/Storage-Lebenszyklen ersetzt werden.
