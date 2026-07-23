import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  Clipboard,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  MapPin,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import * as projectService from "@/app/projects/projectService";
import * as offerService from "@/app/offers/offerService";
import * as invoiceService from "@/app/invoices/invoiceService";
import * as clientService from "@/app/clients/clientService";
import type { Client, Invoice, Offer, Project } from "@/types";
import type {
  ProjectActivity,
  ProjectAppointment,
  ProjectTask,
} from "@/domain/projects";
import {
  PROJECT_PHASES,
  PROJECT_PHASE_LABELS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/domain/projects";
import { ALLOWED_MANUAL_PHASE_TRANSITIONS } from "./projectTransitions";
import { getProjectPrimaryAction } from "./projectPrimaryAction";
import { getSuggestedNextAction } from "./projectNextActions";
import { calculateDocumentTotal } from "@/utils/dashboard";
import { formatMoney } from "@/utils/money";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { LoadErrorCard } from "@/components/LoadErrorCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";

type Tab = "uebersicht" | "aktivitaeten" | "dokumente" | "aufgaben" | "termine" | "dateien";
const tabs: { value: Tab; label: string; icon: typeof History }[] = [
  { value: "uebersicht", label: "Übersicht", icon: FolderOpen },
  { value: "aktivitaeten", label: "Aktivitäten", icon: History },
  { value: "dokumente", label: "Dokumente", icon: FileText },
  { value: "aufgaben", label: "Aufgaben", icon: CheckSquare2 },
  { value: "termine", label: "Termine", icon: CalendarDays },
  { value: "dateien", label: "Dateien & Fotos", icon: FolderOpen },
];

const formatDate = (value?: string | null, withTime = false) =>
  value
    ? new Intl.DateTimeFormat("de-DE", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value))
    : "Nicht festgelegt";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [appointments, setAppointments] = useState<ProjectAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextActionLabel, setNextActionLabel] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const tab = (searchParams.get("tab") as Tab | null) ?? "uebersicht";

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(false);
    try {
      const [projectData, offerData, invoiceData, activityData, taskData, appointmentData] =
        await Promise.all([
          projectService.getProject(projectId),
          offerService.listOffersForProject(projectId),
          invoiceService.listInvoicesForProject(projectId),
          projectService.getProjectActivities(projectId),
          projectService.getProjectTasks(projectId),
          projectService.getProjectAppointments(projectId),
        ]);
      if (!projectData) throw new Error("project_not_found");
      const customer = projectData.clientId ? await clientService.get(projectData.clientId) : null;
      setProject(projectData);
      setClient(customer);
      setOffers(offerData);
      setInvoices(invoiceData);
      setActivities(activityData);
      setTasks(taskData);
      setAppointments(appointmentData);
      setNextActionLabel(projectData.nextActionLabel ?? "");
      setNextActionAt(projectData.nextActionAt?.slice(0, 16) ?? "");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // project id is the complete loading identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const suggestion = useMemo(
    () => (project ? getSuggestedNextAction({ project, offers, invoices, tasks, appointments }) : null),
    [appointments, invoices, offers, project, tasks],
  );
  const primaryAction = project ? getProjectPrimaryAction(project) : null;
  const address = project
    ? [project.addressLine1, project.addressLine2, [project.postalCode, project.city].filter(Boolean).join(" "), project.country].filter(Boolean).join(", ")
    : "";

  const update = async (patch: Record<string, unknown>, success: string) => {
    if (!project) return;
    setSaving(true);
    try {
      const updated = await projectService.updateProject(project.id, patch);
      setProject(updated);
      toast.success(success);
      setActivities(await projectService.getProjectActivities(project.id));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Projekt konnte nicht aktualisiert werden.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div role="status"><AppCard className="p-6">Projekt wird geladen …</AppCard></div>;
  if (error || !project) return <LoadErrorCard title="Projekt konnte nicht geladen werden" onRetry={() => void load()} />;

  const phaseOptions = [project.phase, ...ALLOWED_MANUAL_PHASE_TRANSITIONS[project.phase]].filter(
    (value, index, values) => values.indexOf(value) === index,
  );

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-medium text-[var(--app-muted)] hover:text-[var(--app-text)]" to="/app/projects"><ArrowLeft size={16} /> Alle Projekte</Link>
      <header className="space-y-5 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="app-eyebrow">{project.projectNumber ?? "Projekt"}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{project.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2"><AppBadge color="blue">{PROJECT_PHASE_LABELS[project.phase]}</AppBadge><AppBadge color={project.status === "active" ? "green" : "gray"}>{PROJECT_STATUS_LABELS[project.status]}</AppBadge><AppBadge color={project.priority === "urgent" ? "red" : project.priority === "high" ? "yellow" : "gray"}>{PROJECT_PRIORITY_LABELS[project.priority]}</AppBadge></div>
          </div>
          {primaryAction && <Link to={primaryAction.to}><AppButton className="w-full justify-center sm:w-auto">{primaryAction.label}</AppButton></Link>}
        </div>
        <div className="grid gap-4 border-t border-[var(--app-border)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-xs text-[var(--app-muted)]">Kunde</div><div className="mt-1 font-medium">{client ? client.companyName || client.contactPerson : "Noch kein Kunde"}</div></div>
          <div><div className="text-xs text-[var(--app-muted)]">Projektwert</div><div className="mt-1 font-medium">{project.acceptedValue != null || project.estimatedValue != null ? formatMoney(project.acceptedValue ?? project.estimatedValue ?? 0, "EUR", "de-DE") : "Nicht festgelegt"}</div></div>
          <div><div className="text-xs text-[var(--app-muted)]">Projektort</div><div className="mt-1 font-medium">{address || "Nicht festgelegt"}</div></div>
          <div><div className="text-xs text-[var(--app-muted)]">Zuständig</div><div className="mt-1 font-medium">{project.assignedUserId ? "Zugewiesen" : "Nicht zugewiesen"}</div></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm">Phase<select aria-label="Projektphase ändern" className="app-input" disabled={saving} value={project.phase} onChange={(event) => void update({ phase: event.target.value }, "Projektphase aktualisiert.")}>{phaseOptions.map((phase) => <option key={phase} value={phase}>{PROJECT_PHASE_LABELS[phase]}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm">Status<select aria-label="Projektstatus ändern" className="app-input" disabled={saving} value={project.status} onChange={(event) => void update({ status: event.target.value }, "Projektstatus aktualisiert.")}><option value="active">Aktiv</option><option value="completed">Abgeschlossen</option><option value="cancelled">Abgebrochen</option><option value="archived">Archiviert</option></select></label>
          {client && <Link to={`/app/clients/${client.id}/edit`}><AppButton variant="secondary"><UserRound size={16} /> Kunde öffnen</AppButton></Link>}
          {address && <><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"><AppButton variant="secondary"><MapPin size={16} /> Adresse öffnen</AppButton></a><AppButton variant="ghost" onClick={() => void navigator.clipboard.writeText(address)}><Clipboard size={16} /> Kopieren</AppButton></>}
          {project.status !== "archived" && <AppButton variant="ghost" disabled={saving} onClick={async () => { if (await confirm({ title: "Projekt archivieren", message: "Das Projekt bleibt vollständig erhalten und kann über den Archivfilter gefunden werden." })) void update({ status: "archived" }, "Projekt archiviert."); }}><Archive size={16} /> Archivieren</AppButton>}
        </div>
      </header>

      <nav className="overflow-x-auto border-b border-[var(--app-border)]" aria-label="Projektbereiche"><div className="flex min-w-max gap-1">{tabs.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setSearchParams(value === "uebersicht" ? {} : { tab: value })} className={`flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium ${tab === value ? "border-[var(--app-primary)] text-[var(--app-primary)]" : "border-transparent text-[var(--app-muted)]"}`}><Icon size={16} /> {label}</button>)}</div></nav>

      {tab === "uebersicht" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
          <div className="space-y-5">
            <AppCard className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="app-eyebrow">Nächste Aktion</div><h2 className="mt-1 text-lg font-semibold">{project.nextActionLabel || "Noch nicht festgelegt"}</h2><p className="mt-1 text-sm text-[var(--app-muted)]">{formatDate(project.nextActionAt, true)}</p></div>{project.nextActionAt && new Date(project.nextActionAt) < new Date() && <AppBadge color="red">Überfällig</AppBadge>}</div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]"><input aria-label="Nächste Aktion" className="app-input" value={nextActionLabel} maxLength={240} placeholder="Zum Beispiel: Kunden nachfassen" onChange={(event) => setNextActionLabel(event.target.value)} /><input aria-label="Datum der nächsten Aktion" type="datetime-local" className="app-input" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} /><AppButton disabled={!nextActionLabel.trim() || saving} onClick={() => void update({ nextActionType: "manual", nextActionLabel, nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : "" }, "Nächste Aktion gespeichert.")}>Speichern</AppButton></div>{suggestion && suggestion.label !== project.nextActionLabel && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-semibold">Vorschlag: {suggestion.label}</div><div className="mt-1 text-xs text-[var(--app-muted)]">{suggestion.reason}</div></div><AppButton variant="secondary" onClick={() => void update({ nextActionType: suggestion.type, nextActionLabel: suggestion.label, nextActionAt: suggestion.at ?? "" }, "Vorschlag übernommen.")}>Vorschlag übernehmen</AppButton></div>}</AppCard>
            <AppCard className="p-5"><h2 className="font-semibold">Wichtige Projektdaten</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[var(--app-muted)]">Beschreibung</dt><dd className="mt-1 whitespace-pre-wrap">{project.description || "Nicht angegeben"}</dd></div><div><dt className="text-[var(--app-muted)]">Projektart</dt><dd className="mt-1">{project.projectType || "Nicht angegeben"}</dd></div><div><dt className="text-[var(--app-muted)]">Geplanter Start</dt><dd className="mt-1">{formatDate(project.startDate)}</dd></div><div><dt className="text-[var(--app-muted)]">Zielende</dt><dd className="mt-1">{formatDate(project.targetEndDate)}</dd></div><div><dt className="text-[var(--app-muted)]">Geschätzter Wert</dt><dd className="mt-1">{project.estimatedValue == null ? "Nicht angegeben" : formatMoney(project.estimatedValue, "EUR", "de-DE")}</dd></div><div><dt className="text-[var(--app-muted)]">Angenommener Wert</dt><dd className="mt-1">{project.acceptedValue == null ? "Nicht angegeben" : formatMoney(project.acceptedValue, "EUR", "de-DE")}</dd></div></dl></AppCard>
          </div>
          <div className="space-y-5">
            <AppCard className="p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Dokumente</h2><button className="text-sm font-semibold text-[var(--app-primary)]" onClick={() => setSearchParams({ tab: "dokumente" })}>Alle öffnen</button></div><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>Angebote</span><strong>{offers.length}</strong></div><div className="flex justify-between"><span>Rechnungen</span><strong>{invoices.length}</strong></div></div></AppCard>
            <AppCard className="p-5"><h2 className="font-semibold">Offene Aufgaben</h2>{tasks.length ? <ul className="mt-3 space-y-2 text-sm">{tasks.slice(0, 5).map((task) => <li key={task.id} className="flex justify-between gap-3"><span>{task.title}</span><span className="text-[var(--app-muted)]">{formatDate(task.dueAt)}</span></li>)}</ul> : <p className="mt-2 text-sm text-[var(--app-muted)]">Keine offenen Aufgaben.</p>}</AppCard>
            <AppCard className="p-5"><h2 className="font-semibold">Nächste Termine</h2>{appointments.length ? <ul className="mt-3 space-y-2 text-sm">{appointments.slice(0, 5).map((appointment) => <li key={appointment.id}><div className="font-medium">{appointment.title}</div><div className="text-[var(--app-muted)]">{formatDate(appointment.startsAt, true)}</div></li>)}</ul> : <p className="mt-2 text-sm text-[var(--app-muted)]">Noch keine Termine.</p>}</AppCard>
          </div>
        </div>
      )}

      {tab === "aktivitaeten" && <ActivityTimeline activities={activities} />}
      {tab === "dokumente" && <Documents project={project} offers={offers} invoices={invoices} />}
      {tab === "aufgaben" && <PreparedSection title="Aufgaben" description={tasks.length ? `${tasks.length} offene Aufgaben sind diesem Projekt zugeordnet.` : "Noch keine Aufgaben. Das Datenfundament für projektbezogene Aufgaben ist vorbereitet."} />}
      {tab === "termine" && <PreparedSection title="Termine" description={appointments.length ? `${appointments.length} kommende Termine sind diesem Projekt zugeordnet.` : "Noch keine Termine. Besichtigungen und Projekttermine können auf diesem Fundament ergänzt werden."} />}
      {tab === "dateien" && <PreparedSection title="Dateien & Fotos" description="Der Projektbereich ist vorbereitet. Upload und Baustellendokumentation folgen in einem späteren Arbeitspaket." />}
    </div>
  );
}

function ActivityTimeline({ activities }: { activities: ProjectActivity[] }) {
  if (!activities.length) return <AppCard className="p-8 text-center"><h2 className="font-semibold">Noch keine Aktivitäten</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Projektänderungen und Dokumentereignisse erscheinen hier automatisch.</p></AppCard>;
  return <AppCard className="p-5"><ol className="relative space-y-6 border-l border-[var(--app-border)] pl-6">{activities.map((activity) => <li key={activity.id} className="relative"><span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-[var(--app-primary)] ring-4 ring-[var(--app-surface-solid)]" /><time className="text-xs text-[var(--app-muted)]">{formatDate(activity.createdAt, true)}</time><div className="mt-1 font-medium">{activity.entityId && activity.entityType ? <Link className="hover:underline" to={`/app/${activity.entityType === "offer" ? "offers" : "invoices"}/${activity.entityId}`}>{activity.title} <ExternalLink className="inline" size={13} /></Link> : activity.title}</div>{activity.description && <p className="mt-1 text-sm text-[var(--app-muted)]">{activity.description}</p>}</li>)}</ol></AppCard>;
}

function Documents({ project, offers, invoices }: { project: Project; offers: Offer[]; invoices: Invoice[] }) {
  const returnUrl = encodeURIComponent(`/app/projects/${project.id}?tab=dokumente`);
  return <div className="space-y-4"><div className="flex flex-wrap gap-2"><Link to={`/app/offers/new?projectId=${project.id}&clientId=${project.clientId ?? ""}&returnUrl=${returnUrl}`}><AppButton>Neues Angebot für Projekt</AppButton></Link><Link to={`/app/invoices/new?projectId=${project.id}&clientId=${project.clientId ?? ""}&returnUrl=${returnUrl}`}><AppButton variant="secondary">Neue Rechnung für Projekt</AppButton></Link></div>{!offers.length && !invoices.length ? <AppCard className="p-8 text-center"><h2 className="font-semibold">Noch keine Dokumente</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Erstelle ein Angebot oder eine Rechnung direkt aus diesem Projekt.</p></AppCard> : <AppCard className="overflow-x-auto p-0"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]"><tr><th className="px-4 py-3">Dokument</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Betrag</th><th className="px-4 py-3">Datum</th><th className="px-4 py-3"><span className="sr-only">Aktion</span></th></tr></thead><tbody className="divide-y divide-[var(--app-border)]">{offers.map((offer) => <tr key={offer.id}><td className="px-4 py-3 font-medium">Angebot {offer.number}</td><td className="px-4 py-3">{offer.status}</td><td className="px-4 py-3">{formatMoney(calculateDocumentTotal(offer.positions, offer.vatRate), offer.currency ?? "EUR", "de-DE")}</td><td className="px-4 py-3">{formatDate(offer.date)}</td><td className="px-4 py-3 text-right"><Link className="font-semibold text-[var(--app-primary)]" to={`/app/offers/${offer.id}`}>Öffnen</Link></td></tr>)}{invoices.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3 font-medium">Rechnung {invoice.number ?? "Entwurf"}</td><td className="px-4 py-3">{invoice.status}</td><td className="px-4 py-3">{formatMoney(calculateDocumentTotal(invoice.positions, invoice.vatRate, invoice.isSmallBusiness), invoice.currency ?? "EUR", "de-DE")}</td><td className="px-4 py-3">{formatDate(invoice.date)}</td><td className="px-4 py-3 text-right"><Link className="font-semibold text-[var(--app-primary)]" to={`/app/invoices/${invoice.id}`}>Öffnen</Link></td></tr>)}</tbody></table></AppCard>}</div>;
}

function PreparedSection({ title, description }: { title: string; description: string }) {
  return <AppCard className="p-8 text-center"><h2 className="font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm text-[var(--app-muted)]">{description}</p></AppCard>;
}
