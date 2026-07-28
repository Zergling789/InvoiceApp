-- Remove legacy table privileges inherited from the original foundation.
-- Authenticated clients read through RLS and mutate only through task RPCs.
revoke all privileges on table public.project_tasks from authenticated;
grant select on table public.project_tasks to authenticated;

grant select, insert, update, delete on table public.project_tasks to service_role;
