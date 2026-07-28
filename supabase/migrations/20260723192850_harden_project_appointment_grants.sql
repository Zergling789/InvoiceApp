-- Remove legacy grants inherited from the public schema defaults. Calendar
-- reads require an authenticated organization member; writes use validated RPCs.
revoke all privileges on table public.project_appointments from public, anon, authenticated;
grant select on table public.project_appointments to authenticated;

grant select, insert, update, delete on table public.project_appointments to service_role;
