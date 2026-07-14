# Geschlossene Beta

## Umgesetzt

- sichtbarer Beta-, Marktumfangs- und Prüfungshinweis in der App
- authentifizierter Feedbackkanal mit Kategorien Fehler, Verständnisproblem und Funktionswunsch
- aktuelle Route wird übertragen; Dokumentinhalte und Screenshots werden nicht automatisch erfasst
- serverseitiges Rate Limit und ausschließlich serverseitige Datenbankschreibrechte

## Blockiert

Die offene Supabase-Registrierung ist noch nicht durch einen atomaren Einladungs-/Allowlist-Mechanismus begrenzt. Vor einer tatsächlich geschlossenen Beta muss ein Modell gewählt und vollständig umgesetzt werden: Supabase Before-User-Created-Hook mit gehashten, ablaufenden Einmalcodes oder administrativ gepflegte Allowlist. Zusätzlich sind maximale Nutzerzahl, Missbrauchslimits und Supportprozess festzulegen. Eine reine Frontend-Abfrage eines Einladungscodes reicht nicht aus.

Bis diese serverseitige Zugangssperre aktiv und getestet ist, ist die Anwendung nicht als kontrollierte geschlossene Beta zu bewerten.
