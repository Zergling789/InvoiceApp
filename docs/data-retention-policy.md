# Aufbewahrungs- und Löschpolicy

Standard ist `BLOCKED`: Der Worker verändert keine Nutzerdaten. `DELETE_ALL` darf nur nach externer Freigabe gesetzt werden und entfernt Storage sowie den Auth-Nutzer; durch bestehende Fremdschlüssel werden zugehörige Kontodaten gemäß Schema gelöscht oder anonymisierte Request-Metadaten erhalten.

`ANONYMIZE_AND_RETAIN_FINANCIAL_DOCUMENTS` ist als zukünftige Policy benannt, aber absichtlich nicht aktivierbar. Vor ihrer Implementierung müssen mindestens Aufbewahrungsgrund, Frist, zulässige Snapshotfelder, Kundenanonymisierung, Stripe-Referenzen, Widerruf von Tokens/Sessions und Löschung von KI-, Export- und Firmenassets feldgenau freigegeben werden.

> Die konkrete Aufbewahrungs- und Löschstrategie muss vor Aktivierung extern fachlich und rechtlich freigegeben werden.
