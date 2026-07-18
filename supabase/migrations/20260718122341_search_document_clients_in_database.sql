create or replace function public.list_offer_documents_page(
  p_search text,
  p_client_ids uuid[],
  p_phases text[],
  p_cursor_created_at timestamptz,
  p_cursor_id uuid,
  p_limit integer
)
returns setof public.offers
language sql
stable
security invoker
set search_path = ''
as $$
  select o.*
  from public.offers o
  where o.user_id = (select auth.uid())
    and (
      p_cursor_created_at is null
      or o.created_at < p_cursor_created_at
      or (o.created_at = p_cursor_created_at and o.id < p_cursor_id)
    )
    and (
      nullif(trim(p_search), '') is null
      or position(lower(trim(p_search)) in lower(coalesce(o.number, ''))) > 0
      or (
        coalesce(cardinality(p_client_ids), 0) > 0
        and o.client_id = any(p_client_ids)
      )
      or exists (
        select 1
        from public.clients c
        where c.id = o.client_id
          and c.user_id = (select auth.uid())
          and position(
            lower(trim(p_search)) in lower(concat_ws(
              ' ',
              c.company_name,
              c.contact_person,
              c.first_name,
              c.last_name
            ))
          ) > 0
      )
    )
    and (
      coalesce(cardinality(p_phases), 0) = 0
      or case
        when upper(coalesce(o.status, '')) = 'INVOICED' then 'invoiced'
        when upper(coalesce(o.status, '')) = 'ACCEPTED' then 'accepted'
        when upper(coalesce(o.status, '')) = 'REJECTED' then 'rejected'
        when upper(coalesce(o.status, '')) = 'SENT' or o.sent_at is not null then 'sent'
        else 'draft'
      end = any(p_phases)
    )
  order by o.created_at desc, o.id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 101);
$$;

create or replace function public.list_invoice_documents_page(
  p_search text,
  p_client_ids uuid[],
  p_phases text[],
  p_cursor_created_at timestamptz,
  p_cursor_id uuid,
  p_today date,
  p_limit integer
)
returns setof public.invoices
language sql
stable
security invoker
set search_path = ''
as $$
  select i.*
  from public.invoices i
  where i.user_id = (select auth.uid())
    and (
      p_cursor_created_at is null
      or i.created_at < p_cursor_created_at
      or (i.created_at = p_cursor_created_at and i.id < p_cursor_id)
    )
    and (
      nullif(trim(p_search), '') is null
      or position(lower(trim(p_search)) in lower(coalesce(i.invoice_number, i.number, ''))) > 0
      or position(lower(trim(p_search)) in lower(coalesce(i.client_name, ''))) > 0
      or position(lower(trim(p_search)) in lower(coalesce(i.client_company_name, ''))) > 0
      or position(lower(trim(p_search)) in lower(coalesce(i.client_contact_person, ''))) > 0
      or (
        coalesce(cardinality(p_client_ids), 0) > 0
        and i.client_id = any(p_client_ids)
      )
      or exists (
        select 1
        from public.clients c
        where c.id = i.client_id
          and c.user_id = (select auth.uid())
          and position(
            lower(trim(p_search)) in lower(concat_ws(
              ' ',
              c.company_name,
              c.contact_person,
              c.first_name,
              c.last_name
            ))
          ) > 0
      )
    )
    and (
      coalesce(cardinality(p_phases), 0) = 0
      or case
        when upper(coalesce(i.status, '')) = 'CANCELED' then 'canceled'
        when i.payment_date is not null or upper(coalesce(i.status, '')) = 'PAID' then 'paid'
        when upper(coalesce(i.status, '')) in ('ISSUED', 'SENT')
          and i.paid_at is null
          and i.canceled_at is null
          and i.due_date is not null
          and i.due_date < coalesce(p_today, current_date) then 'overdue'
        when i.sent_at is not null
          or i.last_sent_at is not null
          or coalesce(i.sent_count, 0) > 0
          or upper(coalesce(i.status, '')) = 'SENT' then 'sent'
        when i.finalized_at is not null
          or coalesce(i.is_locked, false)
          or upper(coalesce(i.status, '')) = 'ISSUED' then 'issued'
        else 'draft'
      end = any(p_phases)
    )
  order by i.created_at desc, i.id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 101);
$$;
