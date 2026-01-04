import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import type { Project } from "@/types";
import ModalSheet from "@/components/ui/ModalSheet";
import ProjectForm, { type DraftProject } from "@/features/projects/ProjectForm";
import { useToast } from "@/ui/FeedbackProvider";
import { useClients } from "@/app/clients/clientQueries";
import * as projectService from "@/app/projects/projectService";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

const emptyDraft = (): DraftProject => ({
  name: "",
  clientId: "",
  budgetType: "hourly",
  hourlyRate: 0,
  budgetTotal: 0,
  status: "active",
});

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { clients } = useClients();

  const idRef = useRef(newId());
  const [draft, setDraft] = useState<DraftProject>(() => emptyDraft());
  const initialDraft = useMemo(() => emptyDraft(), []);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const returnUrl = new URLSearchParams(location.search).get("returnUrl");

  const handleClose = () => {
    if (isDirty && !window.confirm("Änderungen verwerfen?")) return;

    if (backgroundLocation) {
      navigate(`${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`, { replace: true });
      return;
    }

    if (returnUrl) {
      navigate(returnUrl, { replace: true });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app");
    }
  };

  const save = async () => {
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
      id: draft.id ?? idRef.current,
      clientId: draft.clientId,
      name,
      budgetType: draft.budgetType,
      hourlyRate: draft.hourlyRate,
      budgetTotal: draft.budgetTotal,
      status: draft.status,
    };

    setSaving(true);
    try {
      await projectService.saveProject(project);
      handleClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet title="Neues Projekt" isOpen onClose={handleClose}>
      <div className="p-6">
        <ProjectForm
          value={draft}
          initialValue={initialDraft}
          clients={clients}
          onChange={setDraft}
          onSave={save}
          onCancel={handleClose}
          saving={saving}
          showHeader={false}
          onDirtyChange={setIsDirty}
        />
      </div>
    </ModalSheet>
  );
}
