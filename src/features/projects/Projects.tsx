import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Plus, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useClients } from "@/app/clients/clientQueries";
import { useProjects } from "@/app/projects/projectQueries";
import { getClientDisplayName } from "@/domain/models/Client";
import {
  formatProjectBudget,
  getProjectPlannedValue,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
} from "@/domain/models/projectPresentation";
import type { Project } from "@/types";
import { formatMoney } from "@/utils/money";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

type StatusFilter = "all" | Project["status"];

export default function Projects() {
  const { clients, loading: clientsLoading, error: clientsError, refresh: refreshClients } = useClients();
  const { projects, loading: projectsLoading, error: projectsError, refresh: refreshProjects } = useProjects();
  const location = useLocation();
  const navigate = useNavigate();
  const lastRefreshTokenRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const loading = projectsLoading || clientsLoading;
  const error = clientsError || projectsError;

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
    return [...projects]
      .filter((project) => statusFilter === "all" || project.status === statusFilter)
      .filter((project) => {
        if (!normalizedQuery) return true;
        const client = clientById.get(project.clientId);
        return `${project.name} ${client ? getClientDisplayName(client) : ""}`.toLocaleLowerCase("de-DE").includes(normalizedQuery);
      })
      .sort((a, b) => PROJECT_STATUS_ORDER[a.status] - PROJECT_STATUS_ORDER[b.status] || a.name.localeCompare(b.name, "de"));
  }, [clientById, projects, query, statusFilter]);

  const activeProjects = projects.filter((project) => project.status === "active");
  const plannedValue = activeProjects.reduce((sum, project) => sum + getProjectPlannedValue(project), 0);

  useEffect(() => {
    const refreshToken = (location.state as { refreshProjects?: number } | null)?.refreshProjects;
    if (!refreshToken || refreshToken === lastRefreshTokenRef.current) return;
    lastRefreshTokenRef.current = refreshToken;
    void Promise.all([refreshProjects(), refreshClients()]);
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: {} });
  }, [location.hash, location.pathname, location.search, location.state, navigate, refreshClients, refreshProjects]);

  const createProject = () => navigate("/app/projects/new", { state: { backgroundLocation: location } });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="app-eyebrow">Arbeitsübersicht</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Projekte</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Aufträge, Kunden und geplante Budgets auf einen Blick.</p>
        </div>
        <AppButton onClick={createProject}><Plus size={17} /> Projekt anlegen</AppButton>
      </header>

      {!loading && projects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <AppCard className="p-4"><div className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Laufende Projekte</div><div className="mt-2 text-2xl font-semibold">{activeProjects.length}</div></AppCard>
          <AppCard className="p-4"><div className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Geplanter Auftragswert</div><div className="mt-2 text-2xl font-semibold">{formatMoney(plannedValue, "EUR", "de-DE")}</div></AppCard>
        </div>
      )}

      {error && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-red-700 dark:text-red-300">Projekte konnten nicht geladen werden</div><div className="mt-1 text-sm text-red-700 dark:text-red-200">{error}</div></div><AppButton variant="secondary" onClick={() => void Promise.all([refreshProjects(), refreshClients()])}>Erneut versuchen</AppButton></div>}

      {!loading && projects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative"><span className="sr-only">Projekte durchsuchen</span><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" /><input className="app-input w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Projekt oder Kunde suchen" /></label>
          <label><span className="sr-only">Projektstatus filtern</span><select className="app-input w-full" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="all">Alle Status</option><option value="active">Laufend</option><option value="completed">Abgeschlossen</option><option value="archived">Archiviert</option></select></label>
        </div>
      )}

      {loading ? (
        <div aria-live="polite"><AppCard className="p-6"><div className="animate-pulse space-y-3"><div className="h-5 w-40 rounded bg-black/10 dark:bg-white/10" /><div className="h-4 w-64 max-w-full rounded bg-black/10 dark:bg-white/10" /></div></AppCard></div>
      ) : projects.length === 0 && !error ? (
        <AppCard className="grid justify-items-center p-8 text-center sm:p-12"><span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]"><BriefcaseBusiness size={25} /></span><h2 className="mt-4 text-lg font-semibold">Noch keine Projekte</h2><p className="mt-2 max-w-md text-sm text-[var(--app-muted)]">Lege einen Auftrag als Projekt an. So behältst du Kunde, Stunden oder Festpreis gemeinsam im Blick.</p><AppButton className="mt-5" onClick={createProject}><Plus size={17} /> Erstes Projekt anlegen</AppButton></AppCard>
      ) : visibleProjects.length === 0 ? (
        <AppCard className="p-8 text-center"><h2 className="font-semibold">Keine passenden Projekte</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Ändere den Suchbegriff oder den ausgewählten Status.</p><AppButton className="mt-4" variant="secondary" onClick={() => { setQuery(""); setStatusFilter("all"); }}>Filter zurücksetzen</AppButton></AppCard>
      ) : (
        <div className="grid gap-3">
          {visibleProjects.map((project) => {
            const client = clientById.get(project.clientId);
            return <AppCard key={project.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{project.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${project.status === "active" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" : project.status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-black/5 text-[var(--app-muted)] dark:bg-white/10"}`}>{PROJECT_STATUS_LABELS[project.status]}</span></div><div className="mt-1 text-sm text-[var(--app-muted)]">{client ? getClientDisplayName(client) : "Kunde nicht mehr verfügbar"}</div></div><div className="shrink-0 text-sm font-medium sm:text-right">{formatProjectBudget(project)}</div></div></AppCard>;
          })}
        </div>
      )}
    </div>
  );
}
