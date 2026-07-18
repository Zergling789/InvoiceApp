create index if not exists clients_user_created_id_idx
  on public.clients (user_id, created_at desc, id desc);

create index if not exists projects_user_created_id_idx
  on public.projects (user_id, created_at desc, id desc);

create index if not exists projects_user_status_created_id_idx
  on public.projects (user_id, status, created_at desc, id desc);

create or replace function public.get_project_metrics()
returns table(active_count bigint, planned_value numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*)::bigint as active_count,
    coalesce(
      sum(
        case
          when p.budget_type = 'hourly' then coalesce(p.hourly_rate, 0) * coalesce(p.budget_total, 0)
          else coalesce(p.budget_total, 0)
        end
      ),
      0
    )::numeric as planned_value
  from public.projects p
  where p.user_id = (select auth.uid())
    and p.status = 'active';
$$;

revoke all on function public.get_project_metrics() from public, anon;
grant execute on function public.get_project_metrics() to authenticated, service_role;
