create index if not exists offers_user_created_id_idx
  on public.offers (user_id, created_at desc, id desc);

create index if not exists invoices_user_created_id_idx
  on public.invoices (user_id, created_at desc, id desc);
