// src/features/projects/Projects.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save, X, RefreshCcw } from "lucide-react";

import { supabase } from "@/supabaseClient";
import type { Client, Project } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { dbListClients } from "@/db/clientsDb";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

type DraftProject = {
  id?: string;
  name: string;
  clientId: string;
  budgetType: Project["budgetType"]; // 'hourly' | 'fixed'
  hourlyRate: number;
  budgetTotal: number;
  status: Project["status"]; // 'active' | 'completed' | 'archived'
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

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const user = data.session?.user;
  if (!user) throw new Error("Nicht eingeloggt (keine Session).");

  return user.id;
}

async function listProjects(): Promise<Project[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("projects")
    .select("id, client_id, name, budget_type, hourly_rate, budget_total, status")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    budgetType: r.budget_type,
    hourlyRate: Number(r.hourly_rate ?? 0),
    budgetTotal: Number(r.budget_total ?? 0),
    status: (r.status ?? "active") as Project["status"],
  }));
}

async function upsertProject(p: Project): Promise<void> {
  const uid = await requireUserId();

  const payload = {
    id: p.id,
    user_id: uid,
    client_id: p.clientId,
    name: p.name,
    budget_type: p.budgetType,
    hourly_rate: Number(p.hourlyRate ?? 0),
    budget_total: Number(p.budgetTotal ?? 0),
    status: p.status,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("projects").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

function humanizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);

  // Supabase/netzwerk typische Fälle
  if (msg.includes("Failed to fetch") || msg.includes("ERR_CONNECTION_CLOSED")) {
    return "Verbindung zu Supabase fehlgeschlagen (Netzwerk/Firewall/VPN oder ENV). Bitte Internet/VPN prüfen und Dev-Server neu starten.";
  }
  return msg;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftProject>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c.companyName]));
    return (id: string) => map.get(id) ?? "Unknown";
  }, [clients]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ps, cs] = await Promise.all([listProjects(), dbListClients()]);
      setProjects(ps);
      setClients(cs);
    } catch (e) {
      console.error(e);
      setError(humanizeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetDraft = () => setDraft(emptyDraft());

  const save = async () => {
    setError(null);

    const name = draft.name.trim();
    if (!name) return alert("Projektname fehlt.");
    if (!draft.clientId) return alert("Bitte Kunde wählen.");

    const p: Project = {
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
      await upsertProject(p);
      setAdding(false);
      resetDraft();
      await refresh();
    } catch (e) {
      console.error(e);
      const msg = humanizeError(e);
      setError(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const budgetLabel = draft.budgetType === "hourly" ? "Budget (Stunden)" : "Budget (EUR)";
  const budgetHint =
    draft.budgetType === "hourly"
      ? "Gib die geplanten Stunden an."
      : "Gib den Festpreis an.";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Projekte</h1>

        <div className="flex gap-2">
          <AppButton variant="secondary" onClick={() => void refresh()} disabled={loading || saving}>
            <RefreshCcw size={16} /> Neu laden
          </AppButton>

          <AppButton onClick={() => setAdding(true)} disabled={saving}>
            <Plus size={16} /> Neues Projekt
          </AppButton>
        </div>
      </div>

      {error && (
        <AppCard className="border border-red-200 bg-red-50">
          <div className="text-sm text-red-800 font-medium mb-1">Fehler</div>
          <div className="text-sm text-red-700">{error}</div>
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
                <option value="">Wählen…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              {clients.length === 0 && !loading && (
                <div className="text-xs text-gray-500 mt-1">
                  Keine Kunden vorhanden – erst Kunden anlegen.
                </div>
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
              <Save size={16} /> {saving ? "Speichere…" : "Speichern"}
            </AppButton>
          </div>
        </AppCard>
      )}

      <AppCard>
        {loading ? (
          <div className="text-gray-500">Lade…</div>
        ) : projects.length === 0 ? (
          <div className="text-gray-500">Noch keine Projekte.</div>
        ) : (
          <div className="divide-y">
            {projects.map((p) => (
              <div key={p.id} className="py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="text-sm text-gray-600">
                    {clientName(p.clientId)} • {p.budgetType} • Status: {p.status}
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
