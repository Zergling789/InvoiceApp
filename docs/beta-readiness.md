# Geschlossene Beta

## Umgesetzt

- sichtbarer Beta-, Marktumfangs- und Prüfungshinweis in der App
- authentifizierter Feedbackkanal mit Kategorien Fehler, Verständnisproblem und Funktionswunsch
- aktuelle Route wird übertragen; Dokumentinhalte und Screenshots werden nicht automatisch erfasst
- serverseitiges Rate Limit und ausschließlich serverseitige Datenbankschreibrechte
- datenbankseitige, ablaufende und einmalig nutzbare E-Mail-Allowlist in `beta_signup_allowlist`
- Supabase-Postgres-Hook `hook_require_beta_signup_invite`, der nicht freigeschaltete direkte Auth-API-Registrierungen blockiert
- Browserrollen haben weder Lese- noch Schreibzugriff auf Einladungen; nur `supabase_auth_admin` darf den Hook ausführen und Einladungen verbrauchen
- verständliche deutsche Meldung bei fehlender oder abgelaufener Beta-Einladung

## Blockiert

Der Hook ist als Migration implementiert, muss aber je Supabase-Projekt unter **Authentication > Hooks > Before User Created** auf folgende Postgres-Funktion aktiviert werden:

```text
pg-functions://postgres/public/hook_require_beta_signup_invite
```

Eine Einladung wird administrativ und ausschließlich serverseitig beziehungsweise im SQL-Editor angelegt:

```sql
insert into public.beta_signup_allowlist (email, expires_at)
values (lower('beta@example.de'), now() + interval '7 days');
```

Die Aktivierung muss anschließend mit einer erlaubten und einer nicht erlaubten E-Mail gegen die echte Auth-API geprüft werden. Zusätzlich sind maximale Nutzerzahl, Missbrauchslimits und Supportprozess festzulegen.

Bis der Hook im produktiven Projekt aktiv und mit beiden Fällen getestet ist, ist die Anwendung nicht als kontrollierte geschlossene Beta zu bewerten.
