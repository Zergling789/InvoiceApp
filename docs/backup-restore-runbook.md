# Backup- und Restore-Runbook

Ein Backup gilt erst als geprüft, wenn es in ein isoliertes Supabase-Testprojekt zurückgespielt und dort verifiziert wurde. Niemals einen Restore-Test gegen Produktion ausführen.

## Ablauf

1. Datenbank, private Storage-Buckets und deren Objektmetadaten als Backupumfang erfassen. Secrets und Hostingkonfiguration getrennt über den jeweiligen Secret Store sichern; niemals in den Datenbankdump schreiben.
2. Backup über den freigegebenen Supabase-Betriebsprozess erzeugen und Backup-ID, Zeitpunkt, Region, Postgres-Version sowie Prüfsumme notieren.
3. Ausschließlich in ein neues, isoliertes Restore-Testprojekt mit separaten API-Schlüsseln einspielen.
4. Migrationsstand mit `npx supabase migration list` und dem Repository vergleichen. Bei neuen Projekten die seit 2026 erforderlichen expliziten Data-API-Grants prüfen.
5. Vor und nach Restore Tabellenanzahl, Zeilenanzahlen je Tabelle sowie Storage-Objektanzahlen vergleichen. Abweichungen begründen.
6. RLS-Aktivierung und Policies prüfen und `tests/rls-isolation.spec.ts` mit zwei ausschließlich dafür erzeugten Testbenutzern ausführen.
7. Eine Entwurfs- und eine finalisierte Rechnung laden; Sperre und Snapshots prüfen und die sichtbare PDF erneut erzeugen.
8. CII-XML und ZUGFeRD erneut erzeugen und KoSIT/Mustang-Ergebnis dokumentieren.
9. Login eines Restore-Testnutzers prüfen. Produktivnutzer dürfen im isolierten Projekt keine echten E-Mails erhalten; SMTP und Stripe bleiben deaktiviert.
10. Private Storage-Assets über nutzergebundene Pfade prüfen. Öffentliche Links und Produktions-Secrets dürfen nicht übernommen werden.
11. RPO als Alter des wiederhergestellten Backups und RTO vom Start bis zur vollständig bestandenen Funktionsprüfung messen.
12. Ergebnis in `docs/restore-test-template.md` oder einem nicht personenbezogenen externen Protokoll erfassen und Testdaten/Backupkopien nach der freigegebenen Frist entfernen.

## Wiederholbarkeit

Der Test ist mindestens vor dem kostenpflichtigen Start, nach wesentlichen Schema-/Storage-Änderungen und anschließend quartalsweise vorgesehen. Ein Restore gilt nur als bestanden, wenn Datenzählung, RLS, Auth, Storage, PDF und E-Rechnung im selben Lauf geprüft wurden.

## Abnahmekriterien

- Migrationen vollständig vorhanden
- keine fremden Daten über RLS lesbar oder veränderbar
- finalisierte Rechnungen bleiben gesperrt und reproduzierbar
- keine Klartext-Empfängertokens in der Datenbank
- keine Produktivzugangsdaten in Logs oder Testartefakten

Die tatsächliche Durchführung benötigt ein separates Supabase-Projekt und kann nicht allein durch Repository-Code nachgewiesen werden.

Aktueller Status am 14. Juli 2026: **BLOCKIERT** – kein freigegebenes Backup und kein bezeichnetes isoliertes Restore-Projekt wurden für diesen Auftrag bereitgestellt. Es wurde kein Restore durchgeführt.
