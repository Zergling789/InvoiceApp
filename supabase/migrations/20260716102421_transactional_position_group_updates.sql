create or replace function public.save_position_group(
  p_group_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'NOT_AUTHENTICATED';
  end if;
  if nullif(btrim(p_name), '') is null or char_length(btrim(p_name)) > 200 then
    raise exception using errcode = '22023', message = 'POSITION_GROUP_INVALID_NAME';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception using errcode = '22023', message = 'POSITION_GROUP_INVALID_ITEMS';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where nullif(btrim(item->>'title'), '') is null
      or char_length(item->>'title') > 200
      or coalesce((item->>'quantity')::numeric, 0) <= 0
      or nullif(btrim(item->>'unit'), '') is null
      or char_length(item->>'unit') > 30
      or ((item ? 'unitPrice') and item->>'unitPrice' is not null and (item->>'unitPrice')::numeric < 0)
      or coalesce((item->>'taxRate')::numeric, -1) < 0
      or coalesce((item->>'taxRate')::numeric, 101) > 100
      or coalesce(item->>'taxCategory', '') not in ('STANDARD','REDUCED','ZERO','EXEMPT','SMALL_BUSINESS','REVERSE_CHARGE')
  ) then
    raise exception using errcode = '22023', message = 'POSITION_GROUP_INVALID_ITEM';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    where nullif(item->>'positionTemplateId', '') is not null
      and not exists (
        select 1 from public.position_templates template
        where template.id = (item->>'positionTemplateId')::uuid and template.user_id = v_user_id
      )
  ) then
    raise exception using errcode = '42501', message = 'POSITION_TEMPLATE_NOT_OWNED';
  end if;

  if p_group_id is null then
    insert into public.position_groups (user_id, name, description, category)
    values (v_user_id, btrim(p_name), left(coalesce(p_description, ''), 2000), left(coalesce(p_category, ''), 100))
    returning id into v_group_id;
  else
    select id into v_group_id
    from public.position_groups
    where id = p_group_id and user_id = v_user_id
    for update;
    if v_group_id is null then
      raise exception using errcode = '42501', message = 'POSITION_GROUP_NOT_OWNED';
    end if;
    update public.position_groups
    set name = btrim(p_name), description = left(coalesce(p_description, ''), 2000), category = left(coalesce(p_category, ''), 100), updated_at = now()
    where id = v_group_id and user_id = v_user_id;
    delete from public.position_group_items where position_group_id = v_group_id and user_id = v_user_id;
  end if;

  insert into public.position_group_items (
    user_id, position_group_id, position_template_id, title, description,
    quantity, unit, unit_price, tax_category, tax_rate, sort_order, optional
  )
  select
    v_user_id,
    v_group_id,
    case when nullif(item->>'positionTemplateId', '') is null then null else (item->>'positionTemplateId')::uuid end,
    btrim(item->>'title'),
    left(coalesce(item->>'description', ''), 2000),
    (item->>'quantity')::numeric,
    btrim(item->>'unit'),
    case when item->>'unitPrice' is null then null else (item->>'unitPrice')::numeric end,
    item->>'taxCategory',
    (item->>'taxRate')::numeric,
    item_order - 1,
    coalesce((item->>'optional')::boolean, false)
  from jsonb_array_elements(p_items) with ordinality as source(item, item_order);

  return v_group_id;
end;
$$;

revoke execute on function public.save_position_group(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.save_position_group(uuid, text, text, text, jsonb) to authenticated;
