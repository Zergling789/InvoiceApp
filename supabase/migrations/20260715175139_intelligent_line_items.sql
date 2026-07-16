create extension if not exists pg_trgm with schema extensions;

create table if not exists public.position_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'SERVICE' check (kind in ('PRODUCT', 'SERVICE', 'TEMPLATE')),
  name text not null check (char_length(name) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default '' check (char_length(category) <= 100),
  unit text not null default 'Stk' check (char_length(unit) between 1 and 30),
  default_quantity numeric null check (default_quantity is null or default_quantity > 0),
  default_unit_price numeric null check (default_unit_price is null or default_unit_price >= 0),
  tax_category text not null default 'STANDARD' check (tax_category in ('STANDARD','REDUCED','ZERO','EXEMPT','SMALL_BUSINESS','REVERSE_CHARGE')),
  tax_rate numeric not null default 19 check (tax_rate >= 0 and tax_rate <= 100),
  product_number text null check (product_number is null or char_length(product_number) <= 100),
  manufacturer text null check (manufacturer is null or char_length(manufacturer) <= 200),
  image_url text null check (image_url is null or char_length(image_url) <= 2000),
  usage_count integer not null default 0 check (usage_count >= 0),
  last_used_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.position_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default '' check (char_length(category) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.position_group_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_group_id uuid not null references public.position_groups(id) on delete cascade,
  position_template_id uuid null references public.position_templates(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'Stk' check (char_length(unit) between 1 and 30),
  unit_price numeric null check (unit_price is null or unit_price >= 0),
  tax_category text not null default 'STANDARD' check (tax_category in ('STANDARD','REDUCED','ZERO','EXEMPT','SMALL_BUSINESS','REVERSE_CHARGE')),
  tax_rate numeric not null default 19 check (tax_rate >= 0 and tax_rate <= 100),
  sort_order integer not null default 0,
  optional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.position_suggestion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid null references public.clients(id) on delete set null,
  document_type text not null check (document_type in ('invoice','offer')),
  query text not null default '' check (char_length(query) <= 500),
  suggestion_type text not null check (suggestion_type in ('PRODUCT','SERVICE','TEMPLATE','HISTORY','AI','GROUP')),
  suggestion_id text null check (suggestion_id is null or char_length(suggestion_id) <= 200),
  action text not null check (action in ('SHOWN','SELECTED','DISCARDED','APPLIED','EDITED','PRICE_CHANGED')),
  original_value jsonb null,
  final_value jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists position_templates_user_id_idx on public.position_templates(user_id);
create index if not exists position_templates_name_trgm_idx on public.position_templates using gin (name extensions.gin_trgm_ops);
create index if not exists position_groups_user_id_idx on public.position_groups(user_id);
create index if not exists position_group_items_group_idx on public.position_group_items(position_group_id, sort_order);
create index if not exists position_group_items_user_id_idx on public.position_group_items(user_id);
create index if not exists position_suggestion_events_user_id_idx on public.position_suggestion_events(user_id, created_at desc);
create index if not exists position_suggestion_events_customer_idx on public.position_suggestion_events(customer_id, created_at desc);

alter table public.position_templates enable row level security;
alter table public.position_groups enable row level security;
alter table public.position_group_items enable row level security;
alter table public.position_suggestion_events enable row level security;

drop policy if exists "position_templates_owner_all" on public.position_templates;
create policy "position_templates_owner_all" on public.position_templates for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "position_groups_owner_all" on public.position_groups;
create policy "position_groups_owner_all" on public.position_groups for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "position_group_items_owner_all" on public.position_group_items;
create policy "position_group_items_owner_all" on public.position_group_items for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.position_groups g where g.id = position_group_id and g.user_id = (select auth.uid())
  )
);
drop policy if exists "position_suggestion_events_owner_all" on public.position_suggestion_events;
create policy "position_suggestion_events_owner_all" on public.position_suggestion_events for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and (
    customer_id is null or exists (
      select 1 from public.clients c where c.id = customer_id and c.user_id = (select auth.uid())
    )
  )
);

revoke all on public.position_templates, public.position_groups, public.position_group_items, public.position_suggestion_events from anon;
grant select, insert, update, delete on public.position_templates, public.position_groups, public.position_group_items to authenticated;
grant select, insert on public.position_suggestion_events to authenticated;
