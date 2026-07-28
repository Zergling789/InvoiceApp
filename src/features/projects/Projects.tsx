import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, Plus, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useClientSummaries } from "@/app/clients/clientQueries";
import { useCurrentProjectUserId, useProjectMetrics, useProjectPages } from "@/app/projects/projectQueries";
import { getClientDisplayName } from "@/domain/models/Client";
import {
  PROJECT_PHASES,
  PROJECT_PHASE_LABELS,
  PROJECT_PRIORITIES,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/domain/projects";
import type { Project } from "@/types";
import type { ProjectSort } from "@/db/projectsDb";
import { formatMoney } from "@/utils/money";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { AppBadge } from "@/ui/AppBadge";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getProjectPrimaryAction } from "./projectPrimaryAction";

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(value)) : "Nicht gesetzt";

export default function Projects() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastRefreshTokenRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Project["status"] | "all">("active");
  const [phase, setPhase] = useState<Project["phase"] | "all">("all");
  const [priority, setPriority] = useState<Project["priority"] | "all">("all");
  const [customerId, setCustomerId] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sort, setSort] = useState<ProjectSort>("attention");
  const debouncedQuery = useDebouncedValue(query.trim());
  const currentUserId = useCurrentProjectUserId();
  const {
    clients,
    loading: clientsLoading,
    error: clientsError,
    refresh: refreshClients,
  } = useClientSummaries();
  const {
    projects,
    loading: projectsLoading,
    loadingMore,
    error: projectsError,
    loadMoreError,
    hasMore,
    refresh: refreshProjects,
    loadMore,
  } = useProjectPages({
    search: debouncedQuery,
    statuses: status === "all" ? null : [status],
    phases: phase === "all" ? undefined : [phase],
    priorities: priority === "all" ? undefined : [priority],
    customerId: customerId || undefined,
    assignedUserId: assignedToMe ? currentUserId ?? undefined : undefined,
    needsAttention: needsAttention || undefined,
    includeArchived: includeArchived || status === "archived",
    sort,
  });
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    refresh: refreshMetrics,
  } = useProjectMetrics();
  const loading = projectsLoading || clientsLoading;
  const error = clientsError || projectsError;
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  useEffect(() => {
    const refreshToken = (location.state as { refreshProjects?: number } | null)?.refreshProjects;
    if (!refreshToken || refreshToken === lastRefreshTokenRef.current) return;
    lastRefreshTokenRef.current = refreshToken;
    void Promise.all([refreshProjects(), refreshClients(), refreshMetrics()]);
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: {} });
  }, [location, navigate, refreshClients, refreshMetrics, refreshProjects]);

  const createProject = () => navigate("/app/projects/new");
  const resetFilters = () => {
    setQuery("");
    setStatus("active");
    setPhase("all");
    setPriority("all");
    setCustomerId("");
    setAssignedToMe(false);
    setNeedsAttention(false);
    setIncludeArchived(false);
    setSort("attention");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="app-eyebrow">Arbeitsübersicht</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Projekte</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Kunden, Angebote, Ausführung und Abrechnung an einem Ort.
          </p>
        </div>
        <AppButton onClick={createProject}><Plus size={17} /> Projekt erstellen</AppButton>
      </header>

      {!metricsLoading && !metricsError && (
        <div className="grid gap-3 sm:grid-cols-2">
          <AppCard className="p-4"><div className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Aktive Projekte</div><div className="mt-2 text-2xl font-semibold">{metrics.activeCount}</div></AppCard>
          <AppCard className="p-4"><div className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Projektwert</div><div className="mt-2 text-2xl font-semibold">{formatMoney(metrics.plannedValue, "EUR", "de-DE")}</div></AppCard>
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="font-semibold text-red-700 dark:text-red-300">Projekte konnten nicht geladen werden</div><div className="mt-1 text-sm text-red-700 dark:text-red-200">Bitte prüfe deine Verbindung und versuche es erneut.</div></div>
          <AppButton variant="secondary" onClick={() => void Promise.all([refreshProjects(), refreshClients(), refreshMetrics()])}>Erneut versuchen</AppButton>
        </div>
      )}

      <AppCard className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="relative md:col-span-2"><span className="sr-only">Projekte durchsuchen</span><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" /><input className="app-input w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Projekt, Nummer oder Kunde" /></label>
          <label><span className="sr-only">Projektstatus filtern</span><select aria-label="Projektstatus filtern" className="app-input w-full" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="active">Aktiv</option><option value="all">Alle Status</option><option value="completed">Abgeschlossen</option><option value="cancelled">Abgebrochen</option><option value="archived">Archiviert</option></select></label>
          <label><span className="sr-only">Projektphase filtern</span><select aria-label="Projektphase filtern" className="app-input w-full" value={phase} onChange={(event) => setPhase(event.target.value as typeof phase)}><option value="all">Alle Phasen</option>{PROJECT_PHASES.map((value) => <option key={value} value={value}>{PROJECT_PHASE_LABELS[value]}</option>)}</select></label>
          <label><span className="sr-only">Priorität filtern</span><select aria-label="Priorität filtern" className="app-input w-full" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="all">Alle Prioritäten</option>{PROJECT_PRIORITIES.map((value) => <option key={value} value={value}>{PROJECT_PRIORITY_LABELS[value]}</option>)}</select></label>
          <label><span className="sr-only">Kunde filtern</span><select aria-label="Kunde filtern" className="app-input w-full" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Alle Kunden</option>{clients.map((client) => <option key={client.id} value={client.id}>{getClientDisplayName(client)}</option>)}</select></label>
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--app-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={needsAttention} onChange={(event) => setNeedsAttention(event.target.checked)} /> Handlungsbedarf</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={assignedToMe} disabled={!currentUserId} onChange={(event) => setAssignedToMe(event.target.checked)} /> Mir zugewiesen</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Archivierte einbeziehen</label>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--app-muted)]" htmlFor="project-sort">Sortierung</label>
            <select id="project-sort" className="app-input" value={sort} onChange={(event) => setSort(event.target.value as ProjectSort)}>
              <option value="attention">Handlungsbedarf</option><option value="updated">Zuletzt aktualisiert</option><option value="next_action">Nächste Aktion</option><option value="created">Erstellungsdatum</option><option value="value">Projektwert</option><option value="priority">Priorität</option>
            </select>
          </div>
        </div>
      </AppCard>

      {loading ? (
        <AppCard aria-live="polite" className="p-6"><div className="animate-pulse space-y-3"><div className="h-5 w-40 rounded bg-black/10 dark:bg-white/10" /><div className="h-4 w-64 max-w-full rounded bg-black/10 dark:bg-white/10" /></div></AppCard>
      ) : projects.length === 0 && !error && !debouncedQuery && status === "active" && phase === "all" && priority === "all" && !customerId ? (
        <AppCard className="grid justify-items-center p-8 text-center sm:p-12"><span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]"><BriefcaseBusiness size={25} /></span><h2 className="mt-4 text-lg font-semibold">Noch keine Projekte</h2><p className="mt-2 max-w-md text-sm text-[var(--app-muted)]">Erstelle dein erstes Projekt und bündele Kunde, Angebot, Termine und Rechnungen an einem Ort.</p><AppButton className="mt-5" onClick={createProject}><Plus size={17} /> Projekt erstellen</AppButton></AppCard>
      ) : projects.length === 0 ? (
        <AppCard className="p-8 text-center"><h2 className="font-semibold">Keine passenden Projekte</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Passe Suche oder Filter an.</p><AppButton className="mt-4" variant="secondary" onClick={resetFilters}>Filter zurücksetzen</AppButton></AppCard>
      ) : (
        <>
          <div className="grid gap-3 md:hidden" data-testid="project-mobile-cards">
            {projects.map((project) => {
              const client = project.clientId ? clientById.get(project.clientId) : undefined;
              const action = getProjectPrimaryAction(project);
              return (
                <AppCard key={project.id} className="p-4">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-xs text-[var(--app-muted)]">{project.projectNumber ?? "Ohne Projektnummer"}</div><Link className="mt-1 block truncate font-semibold hover:underline" to={`/app/projects/${project.id}`}>{project.name}</Link><div className="mt-1 text-sm text-[var(--app-muted)]">{client ? getClientDisplayName(client) : "Noch kein Kunde"}</div></div>{project.priority !== "normal" && <AppBadge color={project.priority === "urgent" ? "red" : "yellow"}>{PROJECT_PRIORITY_LABELS[project.priority]}</AppBadge>}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs text-[var(--app-muted)]">Phase</div><div className="mt-1 font-medium">{PROJECT_PHASE_LABELS[project.phase]}</div></div><div><div className="text-xs text-[var(--app-muted)]">Nächste Aktion</div><div className="mt-1 font-medium">{project.nextActionLabel || "Noch nicht festgelegt"}</div></div></div>
                  <Link className="mt-4 flex min-h-11 items-center justify-between rounded-xl bg-[var(--app-primary)]/10 px-3 text-sm font-semibold text-[var(--app-primary)]" to={action.to}>{action.label}<ArrowRight size={16} /></Link>
                </AppCard>
              );
            })}
          </div>
          <AppCard className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]"><tr><th className="px-4 py-3">Projekt</th><th className="px-4 py-3">Kunde</th><th className="px-4 py-3">Phase</th><th className="px-4 py-3">Priorität</th><th className="px-4 py-3">Nächster Schritt</th><th className="px-4 py-3">Projektwert</th><th className="px-4 py-3">Letzte Aktivität</th></tr></thead>
              <tbody className="divide-y divide-[var(--app-border)]">{projects.map((project) => {
                const client = project.clientId ? clientById.get(project.clientId) : undefined;
                const overdue = Boolean(project.nextActionAt && new Date(project.nextActionAt) < new Date());
                return <tr key={project.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"><td className="px-4 py-4"><Link className="font-semibold hover:underline" to={`/app/projects/${project.id}`}>{project.name}</Link><div className="mt-1 text-xs text-[var(--app-muted)]">{project.projectNumber ?? "—"}</div></td><td className="px-4 py-4">{client ? getClientDisplayName(client) : "Noch kein Kunde"}</td><td className="px-4 py-4"><AppBadge>{PROJECT_PHASE_LABELS[project.phase]}</AppBadge></td><td className="px-4 py-4">{PROJECT_PRIORITY_LABELS[project.priority]}</td><td className="px-4 py-4"><div className={overdue ? "font-semibold text-red-600" : "font-medium"}>{overdue && <AlertTriangle className="mr-1 inline" size={14} />}{project.nextActionLabel || "Nicht festgelegt"}</div><div className="mt-1 text-xs text-[var(--app-muted)]">{formatDate(project.nextActionAt)}</div></td><td className="px-4 py-4">{project.acceptedValue != null || project.estimatedValue != null ? formatMoney(project.acceptedValue ?? project.estimatedValue ?? 0, "EUR", "de-DE") : "—"}</td><td className="px-4 py-4 text-[var(--app-muted)]">{formatDate(project.lastActivityAt || project.updatedAt)}</td></tr>;
              })}</tbody>
            </table>
          </AppCard>
        </>
      )}

      {!loading && !error && hasMore && (
        <div className="flex flex-col items-center gap-2">{loadMoreError && <p role="alert" className="text-sm text-red-600">Weitere Projekte konnten nicht geladen werden.</p>}<AppButton variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Weitere Projekte werden geladen …" : "Weitere Projekte laden"}</AppButton></div>
      )}
    </div>
  );
}
