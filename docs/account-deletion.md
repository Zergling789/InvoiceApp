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

Die Policy-Engine kennt `BLOCKED`, `DELETE_ALL` und `ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS`. Ohne Konfiguration gilt immer `BLOCKED`. Die historische Konfiguration `delete-all-v1` wird rückwärtskompatibel als `DELETE_ALL` gelesen. `ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS` bleibt technisch mit `ACCOUNT_DELETION_POLICY_REVIEW_REQUIRED` blockiert, bis die konkrete Feld- und Aufbewahrungsentscheidung extern freigegeben und implementiert ist.

Der Statusfluss unterstützt `COOLING_OFF`, `CLAIMED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELED` und `BLOCKED_PENDING_REVIEW`. Während der siebentägigen Cooling-off-Phase kann der Nutzer den Auftrag in den Einstellungen widerrufen. Claims bleiben atomar und parallele Worker werden durch `FOR UPDATE SKIP LOCKED` verhindert.

Wenn finalisierte Rechnungen aufbewahrt werden müssen, darf `delete-all-v1` nicht aktiviert werden. Dann ist zuerst eine fachlich freigegebene Anonymisierungs- und Aufbewahrungspolicy zu implementieren.
