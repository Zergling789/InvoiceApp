-- Only block content changes on locked invoices; allow state/metadata updates.
-- Example allowed updates:
-- update public.invoices set status = 'PAID', payment_date = now() where id = '<id>';
-- update public.invoices set sent_count = sent_count + 1, last_sent_at = now() where id = '<id>';
-- Example blocked updates:
-- update public.invoices set positions = '[]' where id = '<id>';
-- update public.invoices set number = 'INV-2025-999' where id = '<id>';

drop trigger if exists trg_prevent_locked_invoice_update on public.invoices;
drop function if exists public.prevent_locked_invoice_update();

create or replace function public.prevent_locked_invoice_content_update()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked then
    if new.user_id is distinct from old.user_id
      or new.number is distinct from old.number
      or new.offer_id is distinct from old.offer_id
      or new.client_id is distinct from old.client_id
      or new.project_id is distinct from old.project_id
      or new.date is distinct from old.date
      or new.due_date is distinct from old.due_date
      or new.positions is distinct from old.positions
      or new.vat_rate is distinct from old.vat_rate
      or new.intro_text is distinct from old.intro_text
      or new.footer_text is distinct from old.footer_text
    then
      raise exception 'Invoice is locked';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_locked_invoice_update
before update on public.invoices
for each row
execute function public.prevent_locked_invoice_content_update();
