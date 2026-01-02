create or replace function public.finalize_invoice(invoice_id uuid, p_user_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices;
  next_num bigint;
begin
  if invoice_id is null or p_user_id is null then
    raise exception 'Missing parameters';
  end if;

  select * into inv
  from public.invoices
  where id = invoice_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if inv.status = 'ISSUED' then
    return inv;
  end if;

  if inv.status <> 'DRAFT' then
    raise exception 'Invoice status transition not allowed';
  end if;

  next_num := public.next_document_number('invoice');

  update public.invoices
  set number = case
        when inv.number is null or btrim(inv.number) = '' then next_num::text
        else inv.number
      end,
      status = 'ISSUED',
      is_locked = true,
      finalized_at = now(),
      updated_at = now()
  where id = invoice_id
    and user_id = p_user_id
  returning * into inv;

  return inv;
end;
$$;
