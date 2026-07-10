-- Private, per-user company logos and immutable invoice branding snapshots.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_assets_select_own" on storage.objects;
create policy "company_assets_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

drop policy if exists "company_assets_insert_own" on storage.objects;
create policy "company_assets_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

drop policy if exists "company_assets_update_own" on storage.objects;
create policy "company_assets_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

drop policy if exists "company_assets_delete_own" on storage.objects;
create policy "company_assets_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

alter table public.user_settings
  drop constraint if exists user_settings_template_id_check;
alter table public.user_settings
  add constraint user_settings_template_id_check
  check (template_id in ('default', 'classic', 'minimal', 'modern'));

alter table public.user_settings
  drop constraint if exists user_settings_primary_color_check;
alter table public.user_settings
  add constraint user_settings_primary_color_check
  check (primary_color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.invoices
  add column if not exists branding_snapshot jsonb null;

create or replace function public.capture_invoice_branding_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  branding jsonb;
begin
  if old.status = 'DRAFT'
     and new.status <> 'DRAFT'
     and new.branding_snapshot is null then
    select jsonb_build_object(
      'companyName', company_name,
      'address', address,
      'taxId', tax_id,
      'iban', iban,
      'bic', bic,
      'bankName', bank_name,
      'footerText', footer_text,
      'logoUrl', logo_url,
      'primaryColor', primary_color,
      'templateId', case when template_id = 'default' then 'classic' else template_id end,
      'locale', locale,
      'currency', currency
    ) into branding
    from public.user_settings
    where user_id = new.user_id;

    new.branding_snapshot := coalesce(branding, '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_capture_invoice_branding_snapshot on public.invoices;
create trigger trg_capture_invoice_branding_snapshot
before update on public.invoices
for each row
execute function public.capture_invoice_branding_snapshot();

revoke all on function public.capture_invoice_branding_snapshot() from public, anon, authenticated;
