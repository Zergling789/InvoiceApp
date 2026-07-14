# Accountlöschung

Die Accountlöschung ist als kontrollierter Statusprozess modelliert. Nutzer müssen ihr aktuelles Passwort erneut eingeben und zusätzlich `LÖSCHEN` bestätigen. Der Server prüft das Passwort über Supabase Auth, verhindert parallele aktive Löschaufträge und legt anschließend einen Auftrag mit siebentägiger Bearbeitungsfrist an. Bestehende Sessions werden global widerrufen; bereits ausgestellte Access Tokens können bis zu ihrem Ablauf gültig bleiben.

Die Tabelle `account_deletion_requests` ist für direkte Schreibzugriffe gesperrt. Nutzer dürfen über RLS ausschließlich den Status ihres eigenen Auftrags lesen. Erstellung und spätere Verarbeitung erfolgen serverseitig.

## Noch offene Verarbeitung

Ein Löschauftrag führt bewusst noch keinen unkontrollierten Cascade-Delete aus. Vor Aktivierung in Production müssen folgende Kategorien mit juristischer Prüfung verbindlich festgelegt und in einem Worker umgesetzt werden:

- sofort löschbare Profil-, Kunden-, Projekt- und Entwurfsdaten
- zu anonymisierende Datensätze
- aufzubewahrende finalisierte Rechnungen und E-Rechnungsmetadaten
- Stripe- und sonstige Abrechnungsdaten
- Audit- und Sicherheitsereignisse
- Logos und sonstige Storage-Objekte unter dem Nutzerpfad
- Widerruf verbleibender Sessions und endgültige Sperrung beziehungsweise Löschung des Auth-Nutzers

Bis dieser Worker und die Aufbewahrungsregeln freigegeben sind, ist der Status technisch als Löschauftrag und nicht als abgeschlossene Löschung zu bezeichnen.
