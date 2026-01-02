create or replace function public.log_offer_activity()
returns trigger
language plpgsql
as $$
declare
  uid uuid := auth.uid();
  should_log boolean := false;
begin
  if uid is null or uid <> new.user_id then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
    values (uid, 'offer', new.id, 'CREATED', '{}'::jsonb);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    should_log :=
      new.number is distinct from old.number
      or new.client_id is distinct from old.client_id
      or new.project_id is distinct from old.project_id
      or new.date is distinct from old.date
      or new.valid_until is distinct from old.valid_until
      or new.positions is distinct from old.positions
      or new.vat_rate is distinct from old.vat_rate
      or new.intro_text is distinct from old.intro_text
      or new.footer_text is distinct from old.footer_text
      or new.status is distinct from old.status
      or new.invoice_id is distinct from old.invoice_id;

    if should_log then
      insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
      values (uid, 'offer', new.id, 'UPDATED', '{}'::jsonb);
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.log_invoice_activity()
returns trigger
language plpgsql
as $$
declare
  uid uuid := auth.uid();
  should_log boolean := false;
begin
  if uid is null or uid <> new.user_id then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
    values (uid, 'invoice', new.id, 'CREATED', '{}'::jsonb);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    should_log :=
      new.number is distinct from old.number
      or new.client_id is distinct from old.client_id
      or new.project_id is distinct from old.project_id
      or new.date is distinct from old.date
      or new.due_date is distinct from old.due_date
      or new.payment_date is distinct from old.payment_date
      or new.positions is distinct from old.positions
      or new.vat_rate is distinct from old.vat_rate
      or new.intro_text is distinct from old.intro_text
      or new.footer_text is distinct from old.footer_text
      or new.status is distinct from old.status
      or new.offer_id is distinct from old.offer_id;

    if should_log then
      insert into public.document_activity (user_id, doc_type, doc_id, event_type, meta)
      values (uid, 'invoice', new.id, 'UPDATED', '{}'::jsonb);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_offers_activity_insert on public.offers;
create trigger trg_offers_activity_insert
after insert on public.offers
for each row
execute function public.log_offer_activity();

drop trigger if exists trg_offers_activity_update on public.offers;
create trigger trg_offers_activity_update
after update on public.offers
for each row
execute function public.log_offer_activity();

drop trigger if exists trg_invoices_activity_insert on public.invoices;
create trigger trg_invoices_activity_insert
after insert on public.invoices
for each row
execute function public.log_invoice_activity();

drop trigger if exists trg_invoices_activity_update on public.invoices;
create trigger trg_invoices_activity_update
after update on public.invoices
for each row
execute function public.log_invoice_activity();
