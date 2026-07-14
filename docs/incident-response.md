# Incident Response

1. Alarm mit Umgebung, Zeitraum, Route, Fehlercode und Request-ID erfassen; keine Nutzdaten in Tickets kopieren.
2. `/api/health` und `/api/health/ready`, Vercel-Deployment, Supabase-Status, Generator-Readiness und Stripe-Webhookzustand prüfen.
3. Bei möglichem Datenzugriff Tokens rotieren, betroffene Funktion abschalten und Service-Role-/Generator-/Stripe-Secrets getrennt behandeln.
4. Umfang, Beginn, betroffene Systeme und sichere Hash-Referenzen dokumentieren. Rechtliche Meldepflichten extern bewerten lassen.
5. Wiederherstellung über bekannten Deployment- oder Image-Digest durchführen, Regressionstest ergänzen und Alarme nach dem Fix beobachten.

Mindestalarme: Readiness länger als zwei Minuten fehlerhaft; 5xx über fünf Prozent in fünf Minuten; p95 über zwei Sekunden; wiederholte Stripe-, E-Rechnungs- oder Löschworkerfehler; stark erhöhte Loginfehler; überschrittenes KI-Tagesbudget. Eskalationskontakte und Rufbereitschaft müssen beim produktiven Monitoring-Anbieter hinterlegt werden.
