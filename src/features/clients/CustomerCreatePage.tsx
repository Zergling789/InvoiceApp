import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import type { Client } from "@/types";
import ModalSheet from "@/components/ui/ModalSheet";
import CustomerForm from "@/features/clients/CustomerForm";
import { useToast } from "@/ui/FeedbackProvider";
import * as clientService from "@/app/clients/clientService";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export default function CustomerCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const idRef = useRef(newId());
  const [draft, setDraft] = useState<Client>(() => clientService.createEmptyClient(idRef.current));
  const initialDraft = useMemo(() => clientService.createEmptyClient(idRef.current), []);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const refreshTokenRef = useRef<number | null>(null);

  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const returnUrl = new URLSearchParams(location.search).get("returnUrl");

  const handleClose = ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    if (!skipConfirm && isDirty && !window.confirm("Änderungen verwerfen?")) return;

    const refreshDocuments = refreshTokenRef.current;
    refreshTokenRef.current = null;

    const buildState = (targetState?: unknown) => {
      if (!refreshDocuments) return targetState;
      return {
        ...(targetState && typeof targetState === "object" ? (targetState as Record<string, unknown>) : {}),
        refreshDocuments,
      };
    };

    if (backgroundLocation) {
      navigate(`${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`, {
        replace: true,
        state: buildState(backgroundLocation.state),
      });
      return;
    }

    if (returnUrl) {
      navigate(returnUrl, { replace: true, state: buildState(undefined) });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app");
    }
  };

  const saveClient = async () => {
    const name = draft.companyName.trim();
    if (!name) {
      toast.error("Firmenname fehlt.");
      return;
    }

    setSaving(true);
    try {
      await clientService.saveClient({
        ...draft,
        companyName: name,
        contactPerson: draft.contactPerson ?? "",
        email: draft.email ?? "",
        address: draft.address ?? "",
        notes: draft.notes ?? "",
      });
      setIsDirty(false);
      refreshTokenRef.current = Date.now();
      handleClose({ skipConfirm: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet title="Neuer Kunde" isOpen onClose={handleClose}>
      <div className="p-6">
        <CustomerForm
          value={draft}
          initialValue={initialDraft}
          onChange={setDraft}
          onSave={saveClient}
          onCancel={handleClose}
          isExisting={false}
          isBusy={saving}
          showHeader={false}
          onDirtyChange={setIsDirty}
        />
      </div>
    </ModalSheet>
  );
}
