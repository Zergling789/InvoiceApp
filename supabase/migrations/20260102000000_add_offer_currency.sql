alter table public.offers
  add column if not exists currency text not null default 'EUR';

update public.offers
set currency = coalesce(
  (select us.currency from public.user_settings us where us.user_id = offers.user_id),
  'EUR'
)
where currency is null or currency = '';
