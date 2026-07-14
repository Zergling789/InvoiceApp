# Datenexport

Authentifizierte Nutzer können unter „Einstellungen → Account und Daten“ einen synchronen ZIP-Export anfordern. Der Server verwendet ausschließlich die aus dem verifizierten Access Token abgeleitete Nutzer-ID und filtert jede Datenquelle explizit nach ihrem Eigentümerfeld.

Das Archiv enthält ein Manifest, Profildaten sowie JSON- und CSV-Dateien für Einstellungen, Kunden, Projekte, Angebote, Rechnungen, Aktivitäten, Absenderidentitäten, Audit-Ereignisse, E-Rechnungsmetadaten und Löschaufträge. Binäre Dokumente werden derzeit nicht zusätzlich dupliziert; finalisierte Dokumente bleiben über ihre gespeicherten Snapshots reproduzierbar.

Der Export wird im Arbeitsspeicher erzeugt, unmittelbar als `application/zip` ausgeliefert, mit `Cache-Control: private, no-store` markiert und nicht in einem öffentlichen Storage-Bucket gespeichert. Die Route ist rate-limitiert. Für große Datenbestände muss vor der öffentlichen Version ein asynchroner Job mit kurzlebigem Einmal-Token ergänzt werden.
