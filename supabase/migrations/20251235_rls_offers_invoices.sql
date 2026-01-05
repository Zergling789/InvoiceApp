alter table public.offers enable row level security;
alter table public.invoices enable row level security;

drop policy if exists offers_select_own on public.offers;
drop policy if exists offers_insert_own on public.offers;
drop policy if exists offers_update_own on public.offers;
drop policy if exists offers_delete_own on public.offers;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers' and policyname = 'offers_select_own'
  ) then
    create policy offers_select_own
      on public.offers for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers' and policyname = 'offers_insert_own'
  ) then
    create policy offers_insert_own
      on public.offers for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers' and policyname = 'offers_update_own'
  ) then
    create policy offers_update_own
      on public.offers for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers' and policyname = 'offers_delete_own'
  ) then
    create policy offers_delete_own
      on public.offers for delete
      using (user_id = auth.uid());
  end if;
end$$;

drop policy if exists invoices_select_own on public.invoices;
drop policy if exists invoices_insert_own on public.invoices;
drop policy if exists invoices_update_own on public.invoices;
drop policy if exists invoices_delete_own on public.invoices;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_select_own'
  ) then
    create policy invoices_select_own
      on public.invoices for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_insert_own'
  ) then
    create policy invoices_insert_own
      on public.invoices for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_update_own'
  ) then
    create policy invoices_update_own
      on public.invoices for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_delete_own'
  ) then
    create policy invoices_delete_own
      on public.invoices for delete
      using (user_id = auth.uid());
  end if;
end$$;
