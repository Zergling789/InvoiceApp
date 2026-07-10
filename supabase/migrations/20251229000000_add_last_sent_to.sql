alter table public.offers
  add column if not exists last_sent_to text null;

alter table public.invoices
  add column if not exists last_sent_to text null;
