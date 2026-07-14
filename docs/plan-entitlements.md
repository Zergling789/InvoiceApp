# Tarifrechte und Nutzungslimits

Tarifrechte werden zentral in `server/billing/entitlements.js` definiert und bei kostenpflichtigen Serverendpunkten geprüft. UI-Anzeigen sind keine Berechtigungsgrenze.

| Recht | Basis | Solo | Pro |
| --- | --- | --- | --- |
| `CREATE_DOCUMENT` | ja, Monatslimit vorgesehen | ja | ja |
| `UNLIMITED_DOCUMENTS` | nein | ja | ja |
| `SEND_EMAIL` | nein | ja | ja |
| `CUSTOM_BRANDING` | nein | ja | ja |
| `AI_DRAFT` | 3/Monat | 30/Monat | 150/Monat |
| `EINVOICE_EXPORT` | nein | ja | ja |
| `DATA_EXPORT` | nein | nein | ja |
| `RECIPIENT_PORTAL` | ja | ja | ja |

Der gesetzliche Account-Datenexport bleibt unabhängig vom Tarif erreichbar und wird nicht mit dem produktbezogenen Recht `DATA_EXPORT` verwechselt.

Nur Stripe-Status `ACTIVE` und `TRIALING` aktivieren einen bezahlten Tarif. `PAST_DUE`, `UNPAID`, `PAUSED`, `CANCELED`, `INCOMPLETE` und unbekannte Status fallen serverseitig auf Basisrechte zurück. Eine Checkout-Success-URL schaltet nichts frei; ausschließlich signierte Webhooks aktualisieren den lokalen Status.

Limitierte Nutzung wird durch `increment_billing_usage` atomar in Postgres gezählt. Der Browser hat weder Schreibrechte auf Zähler noch auf Abonnementdaten. Stabile Fehlercodes sind `PLAN_REQUIRED`, `FEATURE_NOT_INCLUDED`, `USAGE_LIMIT_REACHED`, `SUBSCRIPTION_INACTIVE` und `BILLING_NOT_CONFIGURED`.

Noch offen für einen kostenpflichtigen Start ist die fachliche Festlegung, welche Dokumentoperation den Basis-Dokumentzähler erhöht. Bis dahin darf `UNLIMITED_DOCUMENTS` nicht als vollständig durchgesetztes Produktlimit beworben werden.
