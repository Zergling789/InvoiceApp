# Legacy SQL

`basic.sql` is retained only as historical reference. It predates the active
Supabase migration chain and must not be applied to an existing database.

The formerly eight-digit migration fragments were normalized to valid
14-digit Supabase versions, moved into `../migrations/`, and registered as
applied on the live `invoice_app` project.
