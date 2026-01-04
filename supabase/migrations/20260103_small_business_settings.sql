begin;

alter table public.user_settings
  add column if not exists is_small_business boolean;

alter table public.user_settings
  add column if not exists small_business_note text;

alter table public.user_settings
  alter column is_small_business set default false;

update public.user_settings
  set is_small_business = coalesce(is_small_business, false)
  where is_small_business is null;

alter table public.user_settings
  alter column is_small_business set not null;

alter table public.invoices
  add column if not exists is_small_business boolean;

alter table public.invoices
  add column if not exists small_business_note text;

alter table public.invoices
  alter column is_small_business set default false;

update public.invoices as inv
  set is_small_business = coalesce(inv.is_small_business, us.is_small_business, false)
  from public.user_settings as us
  where inv.user_id = us.user_id
    and inv.is_small_business is null;

update public.invoices
  set is_small_business = coalesce(is_small_business, false)
  where is_small_business is null;

update public.invoices as inv
  set small_business_note = coalesce(
    inv.small_business_note,
    us.small_business_note,
    'Kein Steuerausweis aufgrund der Anwendung der Kleinunternehmerregelung (§ 19 UStG).'
  )
  from public.user_settings as us
  where inv.user_id = us.user_id
    and inv.small_business_note is null;

update public.invoices
  set small_business_note = coalesce(
    small_business_note,
    'Kein Steuerausweis aufgrund der Anwendung der Kleinunternehmerregelung (§ 19 UStG).'
  )
  where small_business_note is null;

alter table public.invoices
  alter column is_small_business set not null;

commit;
