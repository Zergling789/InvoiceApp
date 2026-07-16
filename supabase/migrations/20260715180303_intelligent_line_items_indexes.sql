create index if not exists position_group_items_template_idx
  on public.position_group_items(position_template_id)
  where position_template_id is not null;
