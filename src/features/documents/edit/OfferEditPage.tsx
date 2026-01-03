import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type { Client, Offer, UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { useToast } from "@/ui/FeedbackProvider";
import { fetchSettings } from "@/app/settings/settingsService";
import { DocumentEditor, type EditorSeed } from "@/features/documents/DocumentEditor";
import * as clientService from "@/app/clients/clientService";
import * as offerService from "@/app/offers/offerService";

const buildEditorSeed = (doc: Offer): EditorSeed => ({
  id: doc.id,
  number: String(doc.number ?? ""),
  date: doc.date,
  validUntil: doc.validUntil ?? undefined,
  vatRate: Number(doc.vatRate ?? 0),
  introText: doc.introText ?? "",
  footerText: doc.footerText ?? "",
});

const buildEditorInitial = (doc: Offer) => ({
  id: doc.id,
  number: String(doc.number ?? ""),
  date: doc.date,
  clientId: doc.clientId ?? "",
  projectId: doc.projectId ?? undefined,
  validUntil: doc.validUntil ?? undefined,
  positions: doc.positions ?? [],
  vatRate: Number(doc.vatRate ?? 0),
  status: doc.status,
  introText: doc.introText ?? "",
  footerText: doc.footerText ?? "",
  isLocked: "isLocked" in doc ? doc.isLocked ?? false : false,
  finalizedAt: "finalizedAt" in doc ? doc.finalizedAt ?? null : null,
  sentAt: doc.sentAt ?? null,
  lastSentAt: doc.lastSentAt ?? null,
  sentCount: doc.sentCount ?? 0,
  sentVia: doc.sentVia ?? null,
  invoiceId: doc.invoiceId ?? null,
});

export default function OfferEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<Offer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
  const [editorInitial, setEditorInitial] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) {
        setError("Dokument nicht gefunden.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [clientData, settingsData, documentData] = await Promise.all([
          clientService.list(),
          fetchSettings(),
          offerService.getOffer(id),
        ]);
        if (!mounted) return;
        setClients(clientData);
        setSettings(settingsData);
        if (!documentData) {
          setError("Dokument nicht gefunden.");
          setDoc(null);
          return;
        }
        setDoc(documentData);
        setEditorSeed(buildEditorSeed(documentData));
        setEditorInitial(buildEditorInitial(documentData));
      } catch (e) {
        if (mounted) {
          const message = e instanceof Error ? e.message : String(e);
          setError(message);
          toast.error(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, toast]);

  const handleSaved = async () => {
    if (!id) return;
    const updated = await offerService.getOffer(id);
    if (updated) setDoc(updated);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Lade Angebot...</div>;
  }

  if (error || !doc || !settings || !editorSeed) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error ?? "Angebot konnte nicht geladen werden."}
        </div>
        <Link to="/app/documents">
          <AppButton variant="secondary">Zurück zu Dokumenten</AppButton>
        </Link>
      </div>
    );
  }

  return (
    <DocumentEditor
      type="offer"
      seed={editorSeed}
      settings={settings}
      clients={clients}
      onClose={() => navigate(`/app/documents/offer/${doc.id}`)}
      onSaved={handleSaved}
      initial={editorInitial ?? undefined}
      layout="page"
      showTabs={false}
      actionMode="save-only"
      disableOfferWizard
    />
  );
}
