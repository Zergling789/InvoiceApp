alter table public.offers
  add column if not exists sent_at timestamptz null,
  add column if not exists last_sent_at timestamptz null,
  add column if not exists sent_count integer not null default 0,
  add column if not exists sent_via text null,
  add column if not exists invoice_id uuid null references public.invoices(id) on delete set null;

create index if not exists idx_offers_invoice_id
  on public.offers(invoice_id);

alter table public.invoices
  add column if not exists sent_at timestamptz null,
  add column if not exists last_sent_at timestamptz null,
  add column if not exists sent_count integer not null default 0,
  add column if not exists sent_via text null;
