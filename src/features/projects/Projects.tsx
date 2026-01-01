// src/features/projects/Projects.tsx
import { useMemo, useState } from "react";
import { Plus, Save, X, RefreshCcw } from "lucide-react";

import type { Client, Project } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useToast } from "@/ui/FeedbackProvider";
import { useClients } from "@/app/clients/clientQueries";
import { useProjects } from "@/app/projects/projectQueries";
import * as projectService from "@/app/projects/projectService";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

type DraftProject = {
  id?: string;
  name: string;
  clientId: string;
  budgetType: Project["budgetType"];
  hourlyRate: number;
  budgetTotal: number;
  status: Project["status"];
};

const emptyDraft = (): DraftProject => ({
  name: "",
  clientId: "",
  budgetType: "hourly",
  hourlyRate: 0,
  budgetTotal: 0,
  status: "active",
});

function toNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export default function Projects() {
  const { clients, loading: clientsLoading, error: clientsError, refresh: refreshClients } = useClients();
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    refresh: refreshProjects,
  } = useProjects();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftProject>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const loading = projectsLoading || clientsLoading;

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c.companyName]));
    return (id: string) => map.get(id) ?? "Unknown";
  }, [clients]);

  const refresh = async () => {
    await Promise.all([refreshProjects(), refreshClients()]);
  };

  const resetDraft = () => setDraft(emptyDraft());

  const save = async () => {
    setError(null);

    const name = draft.name.trim();
    if (!name) {
      toast.error("Projektname fehlt.");
      return;
    }
    if (!draft.clientId) {
      toast.error("Bitte Kunde waehlen.");
      return;
    }

    const project: Project = {
      id: draft.id ?? newId(),
      clientId: draft.clientId,
      name,
      budgetType: draft.budgetType,
      hourlyRate: toNumber(draft.hourlyRate, 0),
      budgetTotal: toNumber(draft.budgetTotal, 0),
      status: draft.status,
    };

    setSaving(true);
    try {
      await projectService.saveProject(project);
      setAdding(false);
      resetDraft();
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const budgetLabel = draft.budgetType === "hourly" ? "Budget (Stunden)" : "Budget (EUR)";
  const budgetHint = draft.budgetType === "hourly" ? "Gib die geplanten Stunden an." : "Gib den Festpreis an.";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Projekte</h1>

        <div className="flex flex-wrap gap-2">          <AppButton variant="secondary" onClick={() => void refresh()} disabled={loading || saving}>
            <RefreshCcw size={16} /> Neu laden
          </AppButton>

          <AppButton onClick={() => setAdding(true)} disabled={saving}>
            <Plus size={16} /> Neues Projekt
          </AppButton>
        </div>
      </div>

      {(clientsError || projectsError || error) && (
        <AppCard className="border border-red-200 bg-red-50">
          <div className="text-sm text-red-800 font-medium mb-1">Fehler</div>
          <div className="text-sm text-red-700">{clientsError || projectsError || error}</div>
        </AppCard>
      )}

      {adding && (
        <AppCard className="bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                className="w-full border rounded p-2"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
              <select
                className="w-full border rounded p-2"
                value={draft.clientId}
                onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}
              >
                <option value="">Wählen...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              {clients.length === 0 && !loading && (
                <div className="text-xs text-gray-500 mt-1">Keine Kunden vorhanden – erst Kunden anlegen.</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget-Typ</label>
              <select
                className="w-full border rounded p-2"
                value={draft.budgetType}
                onChange={(e) => setDraft({ ...draft, budgetType: e.target.value as Project["budgetType"] })}
              >
                <option value="hourly">Stundenbasiert</option>
                <option value="fixed">Festpreis</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stundensatz</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={String(draft.hourlyRate)}
                  onChange={(e) => setDraft({ ...draft, hourlyRate: toNumber(e.target.value, 0) })}
                  disabled={draft.budgetType !== "hourly"}
                />
                {draft.budgetType !== "hourly" && (
                  <div className="text-xs text-gray-500 mt-1">Nicht relevant bei Festpreis.</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{budgetLabel}</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={String(draft.budgetTotal)}
                  onChange={(e) => setDraft({ ...draft, budgetTotal: toNumber(e.target.value, 0) })}
                />
                <div className="text-xs text-gray-500 mt-1">{budgetHint}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border rounded p-2"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as Project["status"] })}
              >
                <option value="active">aktiv</option>
                <option value="completed">abgeschlossen</option>
                <option value="archived">archiviert</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <AppButton
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setAdding(false);
                resetDraft();
              }}
            >
              <X size={16} /> Abbrechen
            </AppButton>

            <AppButton disabled={saving} onClick={save}>
              <Save size={16} /> {saving ? "Speichere..." : "Speichern"}
            </AppButton>
          </div>
        </AppCard>
      )}

      <AppCard>
        {loading ? (
          <div className="text-gray-500">Lade...</div>
        ) : projects.length === 0 ? (
          <div className="text-gray-500">Noch keine Projekte.</div>
        ) : (
          <div className="divide-y">
            {projects.map((p) => (
              <div key={p.id} className="py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="text-sm text-gray-600">
                    {clientName(p.clientId)} · {p.budgetType} · Status: {p.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
