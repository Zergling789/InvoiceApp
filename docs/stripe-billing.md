# Stripe Billing

## Unterstützter Umfang

- Abonnements für `SOLO` und `PRO`, jeweils monatlich oder jährlich
- Stripe-hosted Checkout und Stripe Customer Portal
- Lokaler Abonnementstatus ausschließlich aus signierten Webhooks
- Idempotente Verarbeitung anhand der Stripe Event-ID; fehlgeschlagene Events können erneut verarbeitet werden
- Keine Speicherung von Karten- oder Bankdaten in FreelanceFlow

## Konfiguration

Im Stripe-Dashboard vier wiederkehrende Preise erstellen und die IDs sowie geheimen Schlüssel ausschließlich serverseitig setzen:

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SOLO_MONTHLY=
STRIPE_PRICE_SOLO_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
```

Webhook-URL: `https://<domain>/api/stripe/webhook`

Benötigte Events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Das Customer Portal muss im Stripe-Dashboard aktiviert und mit den tatsächlich angebotenen Wechsel- und Kündigungsregeln konfiguriert werden. Preise, Umsatzsteuerbehandlung, Leistungsbeschreibung und Vertragsbedingungen müssen vor Live-Schaltung fachlich geprüft werden. Bis dahin ausschließlich Stripe-Testmodus verwenden.
