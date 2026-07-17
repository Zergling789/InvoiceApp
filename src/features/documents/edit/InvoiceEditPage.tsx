import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import type { Client, Invoice, UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { fetchSettings } from "@/app/settings/settingsService";
import { DocumentEditor, type EditorSeed } from "@/features/documents/DocumentEditor";
import type { DocumentFormData } from "@/features/documents/documentEditorModel";
import * as clientService from "@/app/clients/clientService";
import * as invoiceService from "@/app/invoices/invoiceService";
import { LoadErrorCard } from "@/components/LoadErrorCard";

const buildEditorSeed = (doc: Invoice): EditorSeed => ({
  id: doc.id,
  number: doc.number ?? null,
  date: doc.date,
  serviceDate: doc.serviceDate,
  servicePeriodStart: doc.servicePeriodStart,
  servicePeriodEnd: doc.servicePeriodEnd,
  sellerCountry: doc.sellerCountry,
  customerCountry: doc.customerCountry,
  customerType: doc.customerType,
  serviceCountry: doc.serviceCountry,
  buyerReference: doc.buyerReference,
  paymentTermsDays: doc.paymentTermsDays ?? 14,
  dueDate: doc.dueDate ?? undefined,
  vatRate: Number(doc.vatRate ?? 0),
  isSmallBusiness: doc.isSmallBusiness ?? false,
  smallBusinessNote: doc.smallBusinessNote ?? null,
  introText: doc.introText ?? "",
  footerText: doc.footerText ?? "",
  currency: doc.currency ?? "EUR",
});

const buildEditorInitial = (doc: Invoice): Partial<DocumentFormData> => ({
  id: doc.id,
  number: doc.number ?? null,
  date: doc.date,
  serviceDate: doc.serviceDate,
  servicePeriodStart: doc.servicePeriodStart,
  servicePeriodEnd: doc.servicePeriodEnd,
  sellerCountry: doc.sellerCountry,
  customerCountry: doc.customerCountry,
  customerType: doc.customerType,
  serviceCountry: doc.serviceCountry,
  buyerReference: doc.buyerReference,
  paymentTermsDays: doc.paymentTermsDays ?? 14,
  clientId: doc.clientId ?? "",
  clientName: doc.clientName ?? "",
  clientCompanyName: doc.clientCompanyName ?? "",
  clientContactPerson: doc.clientContactPerson ?? "",
  clientEmail: doc.clientEmail ?? "",
  clientPhone: doc.clientPhone ?? null,
  clientVatId: doc.clientVatId ?? null,
  clientAddress: doc.clientAddress ?? "",
  clientStreet: doc.clientStreet ?? null,
  clientHouseNumber: doc.clientHouseNumber ?? null,
  clientPostalCode: doc.clientPostalCode ?? null,
  clientCity: doc.clientCity ?? null,
  clientElectronicAddress: doc.clientElectronicAddress ?? null,
  clientElectronicAddressScheme: doc.clientElectronicAddressScheme ?? null,
  projectId: doc.projectId ?? undefined,
  offerId: doc.offerId ?? undefined,
  dueDate: doc.dueDate ?? undefined,
  positions: doc.positions ?? [],
  vatRate: Number(doc.vatRate ?? 0),
  isSmallBusiness: doc.isSmallBusiness ?? false,
  smallBusinessNote: doc.smallBusinessNote ?? null,
  status: doc.status,
  introText: doc.introText ?? "",
  footerText: doc.footerText ?? "",
  paymentDate: doc.paymentDate ?? undefined,
  isLocked: doc.isLocked ?? false,
  finalizedAt: doc.finalizedAt ?? null,
  sentAt: doc.sentAt ?? null,
  lastSentAt: doc.lastSentAt ?? null,
  sentCount: doc.sentCount ?? 0,
  sentVia: doc.sentVia ?? null,
  currency: doc.currency ?? "EUR",
});

export default function InvoiceEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
  const [editorInitial, setEditorInitial] = useState<Partial<DocumentFormData> | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/app/documents";

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
          invoiceService.getInvoice(id),
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
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, reloadToken]);

  const handleSaved = async () => {
    if (!id) return;
    const updated = await invoiceService.getInvoice(id);
    if (updated) setDoc(updated);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Lade Rechnung...</div>;
  }

  if (error || !doc || !settings || !editorSeed) {
    return (
      <div className="space-y-3">
        <LoadErrorCard
          title="Rechnung konnte nicht geladen werden"
          onRetry={() => setReloadToken((current) => current + 1)}
        />
        <Link to="/app/documents">
          <AppButton variant="secondary">Zurück zu Dokumenten</AppButton>
        </Link>
      </div>
    );
  }

  return (
    <DocumentEditor
      type="invoice"
      seed={editorSeed}
      settings={settings}
      clients={clients}
      onClose={() => navigate(`/app/invoices/${doc.id}`, { replace: true, state: { returnTo } })}
      onSaved={handleSaved}
      initial={editorInitial ?? undefined}
      layout="page"
      showTabs={false}
      actionMode="save-only"
      disableOfferWizard
      useCreateComposer
      composerEditing
    />
  );
}
