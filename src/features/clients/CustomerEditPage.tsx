import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import * as clientService from "@/app/clients/clientService";
import CustomerForm from "@/features/clients/CustomerForm";
import type { Client } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import * as projectService from "@/app/projects/projectService";
import type { Project } from "@/types";
import { Link } from "react-router-dom";
import { PROJECT_PHASE_LABELS, PROJECT_STATUS_LABELS } from "@/domain/projects";
import { formatMoney } from "@/utils/money";

export default function CustomerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [client, setClient] = useState<Client | null>(null);
  const [initialClient, setInitialClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) { setLoadError(true); setLoading(false); return; }
      setLoading(true);
      setLoadError(false);
      try {
        const [result, projectPage] = await Promise.all([
          clientService.get(id),
          projectService.listProjectsPage({
            customerId: id,
            statuses: null,
            includeArchived: true,
            pageSize: 100,
          }).catch(() => ({ items: [], hasMore: false, nextPage: null })),
        ]);
        if (!active) return;
        setClient(result);
        setInitialClient(result);
        setProjects(projectPage.items);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  const save = async () => {
    if (!client) return;
    const firstName = client.firstName?.trim() ?? "";
    const lastName = client.lastName?.trim() ?? "";
    if (!firstName || !lastName) { toast.error("Vorname und Nachname sind erforderlich."); return; }
    setSaving(true);
    try {
      await clientService.saveClient({ ...client, companyName: client.companyName.trim(), firstName, lastName, contactPerson: `${firstName} ${lastName}` });
      toast.success("Kunde gespeichert.");
      navigate("/app/clients");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde konnte nicht gespeichert werden.");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!client) return;
    const confirmed = await confirm({ title: "Kunde löschen", message: "Möchtest du diesen Kunden wirklich löschen? Zugehörige Dokumente bleiben erhalten." });
    if (!confirmed) return;
    setSaving(true);
    try { await clientService.removeClient(client.id); toast.success("Kunde gelöscht."); navigate("/app/clients"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Kunde konnte nicht gelöscht werden."); setSaving(false); }
  };

  if (loading) return <AppCard className="p-6 text-sm text-[var(--app-muted)]">Kunde wird geladen …</AppCard>;
  if (loadError || !client || !initialClient) return <AppCard className="p-6"><h1 className="font-semibold">Kunde konnte nicht geöffnet werden</h1><p className="mt-1 text-sm text-[var(--app-muted)]">Der Datensatz ist nicht mehr verfügbar oder die Verbindung wurde unterbrochen.</p><AppButton className="mt-4" onClick={() => navigate("/app/clients")}>Zur Kundenübersicht</AppButton></AppCard>;

  return <div className="space-y-6"><CustomerForm value={client} initialValue={initialClient} onChange={setClient} onSave={save} onCancel={() => navigate("/app/clients")} onDelete={remove} isExisting isBusy={saving} /><AppCard className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Projekte</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Aktive, abgeschlossene und nicht gewonnene Projekte dieses Kunden.</p></div><Link to={`/app/projects/new?clientId=${client.id}`}><AppButton>Neues Projekt für diesen Kunden</AppButton></Link></div>{projects.length === 0 ? <p className="mt-5 text-sm text-[var(--app-muted)]">Für diesen Kunden gibt es noch keine Projekte.</p> : <div className="mt-5 divide-y divide-[var(--app-border)]">{projects.map((project) => <Link key={project.id} to={`/app/projects/${project.id}`} className="grid gap-2 py-3 text-sm hover:bg-black/[0.02] sm:grid-cols-[minmax(0,1fr)_160px_140px]"><div><div className="font-semibold">{project.name}</div><div className="text-xs text-[var(--app-muted)]">{project.nextActionLabel || "Keine nächste Aktion"}</div></div><div>{PROJECT_PHASE_LABELS[project.phase]}<div className="text-xs text-[var(--app-muted)]">{PROJECT_STATUS_LABELS[project.status]}</div></div><div className="sm:text-right">{project.acceptedValue != null || project.estimatedValue != null ? formatMoney(project.acceptedValue ?? project.estimatedValue ?? 0, "EUR", "de-DE") : "—"}</div></Link>)}</div>}</AppCard></div>;
}
