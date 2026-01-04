// src/features/projects/Projects.tsx
import { useMemo } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import type { Client } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useClients } from "@/app/clients/clientQueries";
import { useProjects } from "@/app/projects/projectQueries";

export default function Projects() {
  const { clients, loading: clientsLoading, error: clientsError, refresh: refreshClients } = useClients();
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    refresh: refreshProjects,
  } = useProjects();

  const location = useLocation();
  const navigate = useNavigate();

  const loading = projectsLoading || clientsLoading;

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c.companyName]));
    return (id: string) => map.get(id) ?? "Unknown";
  }, [clients]);

  const refresh = async () => {
    await Promise.all([refreshProjects(), refreshClients()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projekte</h1>

        <div className="flex flex-wrap gap-2">
          <AppButton variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCcw size={16} /> Neu laden
          </AppButton>

          <AppButton
            onClick={() => navigate("/app/projects/new", { state: { backgroundLocation: location } })}
          >
            <Plus size={16} /> Neues Projekt
          </AppButton>
        </div>
      </div>

      {(clientsError || projectsError) && (
        <AppCard className="border border-red-200 bg-red-50">
          <div className="text-sm text-red-800 font-medium mb-1">Fehler</div>
          <div className="text-sm text-red-700">{clientsError || projectsError}</div>
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
              <div key={p.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
