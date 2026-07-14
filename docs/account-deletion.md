# Accountlöschung

Nutzer müssen ihr aktuelles Passwort erneut eingeben und zusätzlich `LÖSCHEN` bestätigen. Der Server verhindert parallele Aufträge, plant die Verarbeitung mit sieben Tagen Vorlauf und widerruft bestehende Sessions global.

## Worker

Vercel ruft täglich `GET /api/internal/account-deletions/process` auf. Der Endpunkt verlangt `Authorization: Bearer <CRON_SECRET>`. Fällige Aufträge werden atomar mit `FOR UPDATE SKIP LOCKED` beansprucht. Der Browser hat keine Schreib- oder Ausführungsrechte auf diesen Ablauf.

Der Worker entfernt benutzereigene Firmenassets, löscht den Supabase-Auth-Nutzer über die Service Role und markiert den anonymisierten Auftrag als abgeschlossen. Bei Fehlern wird nur ein stabiler Fehlercode gespeichert.

## Sicherheitsfreigabe

Der Worker ist standardmäßig blockiert. Er läuft nur mit:

```text
ACCOUNT_DELETION_RETENTION_POLICY=delete-all-v1
```

Diese Policy löscht das gesamte Konto einschließlich finalisierter Rechnungen und Abrechnungsmetadaten. Sie darf erst gesetzt werden, nachdem gesetzliche Aufbewahrungspflichten extern geprüft und die vollständige Löschung ausdrücklich freigegeben wurde. Ohne die exakte Policy-Version antwortet der Worker mit `ACCOUNT_DELETION_POLICY_NOT_APPROVED` und verändert keine Nutzerdaten.

Wenn finalisierte Rechnungen aufbewahrt werden müssen, darf `delete-all-v1` nicht aktiviert werden. Dann ist zuerst eine fachlich freigegebene Anonymisierungs- und Aufbewahrungspolicy zu implementieren.
