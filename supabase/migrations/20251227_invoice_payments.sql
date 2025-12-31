create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null,
  currency text not null,
  paid_at timestamptz not null,
  method text null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_payments_invoice_id
  on public.invoice_payments(invoice_id);
create index if not exists idx_invoice_payments_user_id
  on public.invoice_payments(user_id);
create index if not exists idx_invoice_payments_paid_at
  on public.invoice_payments(paid_at);

alter table public.invoice_payments enable row level security;

create policy "invoice_payments_select_own"
  on public.invoice_payments for select
  using (user_id = auth.uid());

create policy "invoice_payments_insert_own"
  on public.invoice_payments for insert
  with check (user_id = auth.uid());

create policy "invoice_payments_update_own"
  on public.invoice_payments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "invoice_payments_delete_own"
  on public.invoice_payments for delete
  using (user_id = auth.uid());
