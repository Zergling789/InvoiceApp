import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import type { Client } from "@/types";
import ModalSheet from "@/components/ui/ModalSheet";
import CustomerForm from "@/features/clients/CustomerForm";
import { useToast } from "@/ui/FeedbackProvider";
import { AppButton } from "@/ui/AppButton";
import * as clientService from "@/app/clients/clientService";
import { BusinessCardScanDialog } from "@/features/clients/BusinessCardScanDialog";
import type { BusinessCardContact } from "@/app/ai/businessCardService";

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
  const [scanOpen, setScanOpen] = useState(() => Boolean((location.state as { scanBusinessCard?: boolean } | null)?.scanBusinessCard));
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

  const applyBusinessCard = (contact: BusinessCardContact) => {
    const nameParts = contact.contactPerson.trim().split(/\s+/);
    const addressLines = contact.address.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const postalMatch = addressLines.find((line) => /^\d{4,5}\s+/.test(line));
    setDraft((current) => ({
      ...current,
      companyName: contact.companyName,
      contactPerson: contact.contactPerson,
      firstName: nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : contact.contactPerson,
      lastName: nameParts.length > 1 ? nameParts.at(-1) ?? "" : "",
      jobTitle: contact.jobTitle,
      email: contact.email,
      phone: contact.phone,
      website: contact.website,
      address: contact.address,
      postalCode: postalMatch?.match(/^(\d{4,5})/)?.[1] ?? "",
      city: postalMatch?.replace(/^\d{4,5}\s+/, "") ?? "",
      notes: contact.notes,
    }));
    setIsDirty(true);
    setScanOpen(false);
    toast.success("Kontaktdaten übernommen. Bitte prüfen und speichern.");
  };

  return (
    <ModalSheet title="Neuer Kunde" isOpen onClose={handleClose}>
      {scanOpen && <BusinessCardScanDialog onClose={() => setScanOpen(false)} onApply={applyBusinessCard} />}
      <div className="p-6">
        <div className="mb-5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-primary)]/[0.05] p-4"><div className="font-semibold">Visitenkarte vorhanden?</div><p className="mt-1 text-sm text-[var(--app-muted)]">Foto aufnehmen und Kontaktdaten automatisch vorausfüllen.</p><AppButton type="button" variant="secondary" className="mt-3" onClick={() => setScanOpen(true)}>Visitenkarte scannen</AppButton></div>
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
