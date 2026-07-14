# Backup- und Restore-Runbook

Ein Backup gilt erst als geprüft, wenn es in ein isoliertes Supabase-Testprojekt zurückgespielt und dort verifiziert wurde. Niemals einen Restore-Test gegen Produktion ausführen.

## Ablauf

1. Backup über den freigegebenen Supabase-Betriebsprozess erzeugen.
2. Ausschließlich in ein separates Restore-Testprojekt einspielen.
3. Migrationsstand mit dem Repository vergleichen.
4. Tabellenanzahlen für Nutzer, Kunden, Angebote, Rechnungen und Aktivitäten prüfen.
5. Eine Entwurfs- und eine finalisierte Rechnung laden.
6. `tests/rls-isolation.spec.ts` mit zwei Testbenutzern ausführen.
7. Rechnungssnapshot, Branding-Snapshot und PDF-Reproduzierbarkeit prüfen.
8. Zeitpunkt, Dauer, Ergebnis, Abweichungen und verantwortliche Person protokollieren.
9. Restore-Testprojekt und lokale Backupkopien gemäß freigegebener Löschfrist entfernen.

## Abnahmekriterien

- Migrationen vollständig vorhanden
- keine fremden Daten über RLS lesbar oder veränderbar
- finalisierte Rechnungen bleiben gesperrt und reproduzierbar
- keine Klartext-Empfängertokens in der Datenbank
- keine Produktivzugangsdaten in Logs oder Testartefakten

Die tatsächliche Durchführung benötigt ein separates Supabase-Projekt und kann nicht allein durch Repository-Code nachgewiesen werden.
