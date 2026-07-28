import { useEffect, useState } from "react";

import type { Client, UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { fetchSettings } from "@/app/settings/settingsService";
import { DocumentEditor, type EditorSeed } from "@/features/documents/DocumentEditor";
import * as clientService from "@/app/clients/clientService";
import * as invoiceService from "@/app/invoices/invoiceService";
import { SMALL_BUSINESS_DEFAULT_NOTE } from "@/utils/smallBusiness";
import type { CreatedDocumentTarget } from "@/features/documents/createdDocumentNavigation";
import { LoadErrorCard } from "@/components/LoadErrorCard";

const toLocalISODate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayISO = () => toLocalISODate(new Date());

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

type InvoiceFormProps = {
  onClose: () => void;
  onSaved?: (document: CreatedDocumentTarget) => void | Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  projectId?: string | null;
};

export function InvoiceForm({ onClose, onSaved, onDirtyChange, projectId }: InvoiceFormProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientData, settingsData] = await Promise.all([
          clientService.list(),
          fetchSettings(),
        ]);
        if (!mounted) return;
        const defaultTerms = Number(settingsData.defaultPaymentTerms ?? 14);
        const seed: EditorSeed = {
          id: newId(),
          number: null,
          date: todayISO(),
          paymentTermsDays: defaultTerms,
          dueDate: invoiceService.buildDueDate(todayISO(), defaultTerms),
          vatRate: Number(settingsData.defaultVatRate ?? 0),
          isSmallBusiness: settingsData.isSmallBusiness ?? false,
          smallBusinessNote: settingsData.smallBusinessNote ?? SMALL_BUSINESS_DEFAULT_NOTE,
          introText: "",
          footerText: `Zahlbar innerhalb von ${defaultTerms} Tagen ohne Abzug.`,
          currency: "EUR",
        };
        setClients(clientData);
        setSettings(settingsData);
        setEditorSeed(seed);
      } catch (e) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [reloadToken]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-6">Lade Rechnung...</div>;
  }

  if (error || !settings || !editorSeed) {
    return (
      <div className="space-y-3 p-6">
        <LoadErrorCard
          title="Rechnungserstellung konnte nicht geladen werden"
          onRetry={() => setReloadToken((current) => current + 1)}
        />
        <AppButton variant="secondary" onClick={onClose}>
          Zurück
        </AppButton>
      </div>
    );
  }

  return (
    <DocumentEditor
      type="invoice"
      seed={editorSeed}
      settings={settings}
      clients={clients}
      initial={projectId ? { projectId } : undefined}
      onClose={onClose}
      onSaved={async () => {
        await onSaved?.({ id: editorSeed.id, type: "invoice" });
      }}
      layout="embedded"
      showHeader={false}
      useCreateComposer
      onDirtyChange={onDirtyChange}
    />
  );
}

export default InvoiceForm;
