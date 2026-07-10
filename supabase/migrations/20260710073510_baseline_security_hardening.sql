begin;

-- Remove legacy SECURITY DEFINER overloads that trusted a caller-supplied user id.
drop function if exists public.finalize_invoice(uuid, uuid);
drop function if exists public.mark_invoice_sent(uuid, uuid, text, text);
drop function if exists public.mark_offer_sent(uuid, uuid, text, text);

-- Registration profile required by the frontend.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  company_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- This was a temporary connectivity probe and must not remain in the Data API.
drop table if exists public.test_connection;

-- Rebuild all user-facing policies with explicit roles and init-plan-safe auth calls.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'user_settings', 'clients', 'projects', 'offers', 'invoices',
        'sender_identities', 'document_counters', 'document_activity', 'profiles'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

create policy user_settings_select_own on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy clients_select_own on public.clients
  for select to authenticated using ((select auth.uid()) = user_id);
create policy clients_insert_own on public.clients
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy clients_update_own on public.clients
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy clients_delete_own on public.clients
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy projects_select_own on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy projects_insert_own on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy projects_update_own on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy projects_delete_own on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy offers_select_own on public.offers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy offers_insert_own on public.offers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy offers_update_own on public.offers
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy offers_delete_own on public.offers
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy invoices_select_own on public.invoices
  for select to authenticated using ((select auth.uid()) = user_id);
create policy invoices_insert_own on public.invoices
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy invoices_update_own on public.invoices
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy invoices_delete_own on public.invoices
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy sender_identities_select_own on public.sender_identities
  for select to authenticated using ((select auth.uid()) = user_id);
create policy sender_identities_insert_own on public.sender_identities
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sender_identities_update_own on public.sender_identities
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy sender_identities_delete_own on public.sender_identities
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy document_counters_select_own on public.document_counters
  for select to authenticated using ((select auth.uid()) = user_id);
create policy document_counters_insert_own on public.document_counters
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy document_counters_update_own on public.document_counters
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy document_activity_select_own on public.document_activity
  for select to authenticated using ((select auth.uid()) = user_id);
create policy document_activity_insert_own on public.document_activity
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Explicit table privileges: no unauthenticated access to private application data.
revoke all privileges on table
  public.user_settings,
  public.clients,
  public.projects,
  public.offers,
  public.invoices,
  public.sender_identities,
  public.document_counters,
  public.document_activity,
  public.profiles
from public, anon;

grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.offers to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.sender_identities to authenticated;
grant select, insert, update on public.document_counters to authenticated;
grant select, insert on public.document_activity to authenticated;
grant select, insert, update on public.profiles to authenticated;

-- Internal-only tables are accessible exclusively through the service-role backend.
revoke all privileges on table public.audit_events from public, anon, authenticated;
revoke all privileges on table public.sender_identity_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.audit_events to service_role;
grant select, insert, update, delete on public.sender_identity_tokens to service_role;

-- Lock down privileged user RPCs. Each remaining SECURITY DEFINER RPC validates auth.uid().
revoke all on function public.next_document_number(text) from public, anon;
revoke all on function public.finalize_invoice(uuid) from public, anon;
revoke all on function public.mark_invoice_sent(uuid, text, text) from public, anon;
revoke all on function public.mark_offer_sent(uuid, text, text) from public, anon;
revoke all on function public.convert_offer_to_invoice(uuid) from public, anon;
revoke all on function public.copy_customer_snapshot_to_invoice(uuid) from public, anon;

grant execute on function public.next_document_number(text) to authenticated;
grant execute on function public.finalize_invoice(uuid) to authenticated;
grant execute on function public.mark_invoice_sent(uuid, text, text) to authenticated;
grant execute on function public.mark_offer_sent(uuid, text, text) to authenticated;
grant execute on function public.convert_offer_to_invoice(uuid) to authenticated;
grant execute on function public.copy_customer_snapshot_to_invoice(uuid) to authenticated;

-- Trigger functions do not need to be directly callable through the API.
revoke all on function public.enforce_invoice_status_transition() from public, anon, authenticated;
revoke all on function public.enforce_offer_status_transition() from public, anon, authenticated;
revoke all on function public.log_invoice_activity() from public, anon, authenticated;
revoke all on function public.log_offer_activity() from public, anon, authenticated;
revoke all on function public.prevent_finalized_invoice_number_update() from public, anon, authenticated;
revoke all on function public.prevent_locked_invoice_content_update() from public, anon, authenticated;
revoke all on function public.set_invoice_due_date() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.validate_invoice_status_transition() from public, anon, authenticated;

alter function public.enforce_invoice_status_transition() set search_path = pg_catalog, public;
alter function public.enforce_offer_status_transition() set search_path = pg_catalog, public;
alter function public.log_invoice_activity() set search_path = pg_catalog, public;
alter function public.log_offer_activity() set search_path = pg_catalog, public;
alter function public.prevent_finalized_invoice_number_update() set search_path = pg_catalog, public;
alter function public.prevent_locked_invoice_content_update() set search_path = pg_catalog, public;
alter function public.set_invoice_due_date() set search_path = pg_catalog, public;
alter function public.set_updated_at() set search_path = pg_catalog, public;
alter function public.validate_invoice_status_transition() set search_path = pg_catalog, public;

commit;
