create or replace function public.guard_notification_read_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_read then
    if new.is_read is distinct from old.is_read
      or new.read_at is distinct from old.read_at then
      raise exception 'NOTIFICATION_ALREADY_READ' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.is_read is not true or new.read_at is null then
    raise exception 'NOTIFICATION_READ_TRANSITION_INVALID' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_notification_read_transition()
  from public, anon, authenticated;

drop trigger if exists notifications_guard_read_transition on public.notifications;
create trigger notifications_guard_read_transition
before update on public.notifications
for each row
execute function public.guard_notification_read_transition();
