alter table public.invoices
  add column if not exists is_locked boolean not null default false,
  add column if not exists finalized_at timestamptz null;

create or replace function public.prevent_locked_invoice_update()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked then
    raise exception 'Invoice is locked';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_locked_invoice_update on public.invoices;
create trigger trg_prevent_locked_invoice_update
before update on public.invoices
for each row
execute function public.prevent_locked_invoice_update();
