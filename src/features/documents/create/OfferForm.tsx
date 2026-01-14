import { useEffect, useState } from "react";

import type { Client, UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { useToast } from "@/ui/FeedbackProvider";
import { fetchSettings } from "@/app/settings/settingsService";
import { getNextDocumentNumber } from "@/app/numbering/numberingService";
import { DocumentEditor, type EditorSeed } from "@/features/documents/DocumentEditor";
import * as clientService from "@/app/clients/clientService";

const toLocalISODate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayISO = () => toLocalISODate(new Date());
const addDaysISO = (days: number) => toLocalISODate(new Date(Date.now() + days * 86400000));

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

type OfferFormProps = {
  onClose: (force?: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function OfferForm({ onClose, onSaved, onDirtyChange }: OfferFormProps) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);

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
        const num = await getNextDocumentNumber("offer", settingsData);
        const seed: EditorSeed = {
          id: newId(),
          number: num,
          date: todayISO(),
          validUntil: addDaysISO(14),
          vatRate: Number(settingsData.defaultVatRate ?? 0),
          introText: "Gerne unterbreite ich Ihnen folgendes Angebot:",
          footerText: "Ich freue mich auf Ihre Rückmeldung.",
          currency: settingsData.currency ?? "EUR",
        };
        setClients(clientData);
        setSettings(settingsData);
        setEditorSeed(seed);
      } catch (e) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        toast.error(message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-6">Lade Angebot...</div>;
  }

  if (error || !settings || !editorSeed) {
    return (
      <div className="space-y-3 p-6">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error ?? "Angebot konnte nicht geladen werden."}
        </div>
        <AppButton variant="secondary" onClick={() => onClose()}>
          Zurück
        </AppButton>
      </div>
    );
  }

  return (
    <DocumentEditor
      type="offer"
      seed={editorSeed}
      settings={settings}
      clients={clients}
      onClose={onClose}
      onSaved={async () => {
        await onSaved?.();
      }}
      layout="embedded"
      showHeader={false}
      onDirtyChange={onDirtyChange}
    />
  );
}

export default OfferForm;
