# Datenschutz-Datenflüsse

| Vorgang | Daten | Empfänger | Protokollierung |
| --- | --- | --- | --- |
| Registrierung und Login | E-Mail, Authentifizierungsdaten | Supabase Auth | keine Passwörter oder Tokens |
| Dokumentverwaltung | Unternehmens-, Kunden-, Projekt- und Rechnungsdaten | Supabase Datenbank/Storage | nur technische IDs gehasht |
| E-Mail-Versand | Empfänger, Betreff, Nachricht, PDF | konfigurierter SMTP-Anbieter | keine vollständigen Mailinhalte |
| Stripe Billing | Nutzerreferenz, Plan, Subscriptionstatus | Stripe | keine vollständigen Webhook-Payloads |
| KI-Entwurf | aktiv eingegebene Beschreibung | OpenAI bei aktivierter Funktion | keine Prompts in Standardlogs |
| Visitenkarte | aktiv ausgewähltes Bild | OpenAI bei aktivierter Funktion | Bild wird nicht als Auditinhalt gespeichert |
| E-Rechnung | Sicht-PDF und CII-XML | isolierter Generator | nur Request-ID, Status, Code und Laufzeit |
| Accountexport/-löschung | eigene Kontodaten | serverinterne Worker/privater Storage | stabile Fehlercodes ohne Personeninhalte |

Regionen, Löschfristen, Rechtsgrundlagen und Transfermechanismen sind vor Produktion anhand der tatsächlich gebuchten Anbieter und Verträge extern zu vervollständigen.
