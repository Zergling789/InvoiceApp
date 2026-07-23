import { useMemo, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import ModalSheet from "@/components/ui/ModalSheet";
import ProjectForm, { type DraftProject } from "./ProjectForm";
import { useToast } from "@/ui/FeedbackProvider";
import { useClients } from "@/app/clients/clientQueries";
import * as projectService from "@/app/projects/projectService";
import { LoadErrorCard } from "@/components/LoadErrorCard";
import { AppButton } from "@/ui/AppButton";

const emptyDraft = (customerId?: string | null): DraftProject => ({
  customerId: customerId || undefined,
  title: "",
  priority: "normal",
  country: "Deutschland",
});

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const params = new URLSearchParams(location.search);
  const requestedCustomerId = params.get("clientId");
  const { clients, loading, error, refresh } = useClients();
  const initialDraft = useMemo(() => emptyDraft(requestedCustomerId), [requestedCustomerId]);
  const [draft, setDraft] = useState<DraftProject>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;

  const close = () => {
    if (dirty && !window.confirm("Änderungen verwerfen?")) return;
    if (backgroundLocation) {
      navigate(`${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`, { replace: true });
    } else {
      navigate("/app/projects");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const project = await projectService.createProject({ ...draft, phase: "inquiry" });
      setDirty(false);
      toast.success("Projekt wurde erstellt.");
      navigate(`/app/projects/${project.id}`, { replace: true });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Projekt konnte nicht erstellt werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet title="Neues Projekt" isOpen onClose={close} width="wide" contentMode="contained">
      <div className="p-4 sm:p-6">
        {loading ? <div role="status" className="py-8 text-center text-sm text-[var(--app-muted)]">Kunden werden geladen …</div> : error ? <div className="space-y-3"><LoadErrorCard title="Kunden konnten nicht geladen werden" onRetry={() => void refresh()} /><AppButton variant="secondary" onClick={close}>Zurück</AppButton></div> : <ProjectForm value={draft} initialValue={initialDraft} clients={clients} onChange={setDraft} onSave={() => void save()} onCancel={close} saving={saving} onDirtyChange={setDirty} onCreateClient={() => navigate(`/app/customers/new?returnUrl=${encodeURIComponent(`${location.pathname}${location.search}`)}`)} />}
      </div>
    </ModalSheet>
  );
}

