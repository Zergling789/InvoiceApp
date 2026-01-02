alter table public.offers enable row level security;
alter table public.invoices enable row level security;

drop policy if exists offers_select_own on public.offers;
drop policy if exists offers_insert_own on public.offers;
drop policy if exists offers_update_own on public.offers;
drop policy if exists offers_delete_own on public.offers;

create policy offers_select_own
  on public.offers for select
  using (user_id = auth.uid());

create policy offers_insert_own
  on public.offers for insert
  with check (user_id = auth.uid());

create policy offers_update_own
  on public.offers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy offers_delete_own
  on public.offers for delete
  using (user_id = auth.uid());

drop policy if exists invoices_select_own on public.invoices;
drop policy if exists invoices_insert_own on public.invoices;
drop policy if exists invoices_update_own on public.invoices;
drop policy if exists invoices_delete_own on public.invoices;

create policy invoices_select_own
  on public.invoices for select
  using (user_id = auth.uid());

create policy invoices_insert_own
  on public.invoices for insert
  with check (user_id = auth.uid());

create policy invoices_update_own
  on public.invoices for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy invoices_delete_own
  on public.invoices for delete
  using (user_id = auth.uid());
