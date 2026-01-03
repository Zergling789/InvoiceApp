import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileDown, Mail, MoreVertical, Pencil } from "lucide-react";

import type { Client, Invoice, Offer, Position, UserSettings } from "@/types";
import { InvoiceStatus, OfferStatus, formatCurrency, formatDate } from "@/types";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { calcGross, calcNet, calcVat } from "@/domain/rules/money";
import { canConvertToInvoice } from "@/domain/rules/offerRules";
import { isInvoiceOverdue } from "@/utils/dashboard";
import { downloadDocumentPdf } from "@/app/pdf/documentPdfService";
import { fetchSettings } from "@/app/settings/settingsService";
import { DocumentEditor, type EditorSeed } from "@/features/documents/DocumentEditor";
import { SendDocumentModal } from "@/features/documents/SendDocumentModal";
import { supabase } from "@/supabaseClient";
import { mapErrorCodeToToast } from "@/utils/errorMapping";
import * as clientService from "@/app/clients/clientService";
import * as invoiceService from "@/app/invoices/invoiceService";
import * as offerService from "@/app/offers/offerService";
import { formatDocumentStatus } from "@/features/documents/utils/formatStatus";

const statusTone = (status: InvoiceStatus | OfferStatus) => {
  if (status === InvoiceStatus.PAID || status === OfferStatus.ACCEPTED) return "green";
  if (status === InvoiceStatus.OVERDUE || status === OfferStatus.REJECTED) return "red";
  if (status === InvoiceStatus.SENT || status === InvoiceStatus.ISSUED || status === OfferStatus.SENT) return "blue";
  return "gray";
};

const toNumberOrZero = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const buildEditorSeed = (doc: Invoice | Offer, type: "invoice" | "offer"): EditorSeed => ({
  id: doc.id,
  number: String(doc.number ?? ""),
  date: doc.date,
  dueDate: type === "invoice" ? (doc as Invoice).dueDate : undefined,
  validUntil: type === "offer" ? (doc as Offer).validUntil : undefined,
  vatRate: Number(doc.vatRate ?? 0),
  introText: doc.introText ?? "",
  footerText: doc.footerText ?? "",
});

export default function DocumentDetailPage() {
  const { type, id } = useParams<{ type: "offer" | "invoice"; id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<Invoice | Offer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
  const [editorInitial, setEditorInitial] = useState<any>(null);

  const docType = type === "invoice" ? "invoice" : "offer";

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientData, settingsData, documentData] = await Promise.all([
          clientService.list(),
          fetchSettings(),
          docType === "invoice" && id ? invoiceService.getInvoice(id) : offerService.getOffer(id ?? ""),
        ]);
        if (!mounted) return;
        setClients(clientData);
        setSettings(settingsData);
        setDoc(documentData ?? null);
        if (!documentData) {
          setError("Dokument nicht gefunden.");
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [docType, id]);

  const client = useMemo(() => {
    if (!doc) return undefined;
    return clients.find((entry) => entry.id === doc.clientId);
  }, [clients, doc]);

  const totals = useMemo(() => {
    if (!doc) return { net: 0, vat: 0, gross: 0 };
    const net = calcNet(doc.positions ?? []);
    const vat = calcVat(net, toNumberOrZero(doc.vatRate));
    return { net, vat, gross: calcGross(net, vat) };
  }, [doc]);

  const timeline = useMemo(() => {
    if (!doc) return [];
    const items: Array<{ label: string; value: string }> = [];
    if (doc.date) items.push({ label: "Erstellt", value: formatDate(doc.date, "de-DE") });
    if ("finalizedAt" in doc && doc.finalizedAt) {
      items.push({ label: "Finalisiert", value: formatDate(doc.finalizedAt, "de-DE") });
    }
    if (doc.sentAt || doc.lastSentAt) {
      const sentDate = doc.lastSentAt ?? doc.sentAt;
      if (sentDate) items.push({ label: "Gesendet", value: formatDate(sentDate, "de-DE") });
    }
    if ("paymentDate" in doc && doc.paymentDate) {
      items.push({ label: "Bezahlt", value: formatDate(doc.paymentDate, "de-DE") });
    }
    return items;
  }, [doc]);

  const defaultSubject = useMemo(() => {
    if (!doc || !settings) return "";
    const dokument = docType === "invoice" ? "Rechnung" : "Angebot";
    const template = settings.emailDefaultSubject?.trim() || `${dokument} {nummer}`;
    return template.replace("{nummer}", String(doc.number ?? ""));
  }, [doc, docType, settings]);

  const defaultMessage = useMemo(() => {
    if (!settings) return "";
    return settings.emailDefaultText?.trim() || "Bitte im Anhang finden Sie das Dokument.";
  }, [settings]);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      await downloadDocumentPdf({ type: docType, docId: doc.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF konnte nicht erstellt werden.");
    }
  };

  const handleMarkPaid = async () => {
    if (!doc || docType !== "invoice") return;
    const invoice = doc as Invoice;
    if (invoice.status === InvoiceStatus.PAID) return;
    const ok = await confirm({
      title: "Als bezahlt markieren",
      message: "Soll die Rechnung als bezahlt markiert werden?",
    });
    if (!ok) return;
    const now = new Date().toISOString();
    await invoiceService.saveInvoice({
      ...invoice,
      status: InvoiceStatus.PAID,
      paymentDate: now,
    });
    setDoc({ ...invoice, status: InvoiceStatus.PAID, paymentDate: now });
    toast.success("Rechnung als bezahlt markiert.");
  };

  const handleOfferAccepted = async () => {
    if (!doc || docType !== "offer") return;
    const offer = doc as Offer;
    if (offer.status === OfferStatus.ACCEPTED) return;
    const ok = await confirm({
      title: "Angebot annehmen",
      message: "Soll das Angebot als angenommen markiert werden?",
    });
    if (!ok) return;
    await offerService.saveOffer({ ...offer, status: OfferStatus.ACCEPTED });
    setDoc({ ...offer, status: OfferStatus.ACCEPTED });
    toast.success("Angebot als angenommen markiert.");
  };

  const handleConvertToInvoice = async () => {
    if (!doc || docType !== "offer") return;
    const offer = doc as Offer;
    if (!canConvertToInvoice(offer)) {
      toast.error("Dieses Angebot kann nicht mehr umgewandelt werden.");
      return;
    }
    const ok = await confirm({
      title: "Rechnung erstellen",
      message: "Angebot in Rechnung umwandeln?",
    });
    if (!ok) return;
    const { data, error: rpcError } = await supabase.rpc("convert_offer_to_invoice", {
      offer_id: offer.id,
    });
    if (rpcError) {
      toast.error(mapErrorCodeToToast(rpcError.code ?? rpcError.message) || "Angebot konnte nicht umgewandelt werden.");
      return;
    }
    const invoiceId = data?.id;
    if (!invoiceId) {
      toast.error("Rechnung konnte nicht erstellt werden.");
      return;
    }
    navigate(`/app/documents/invoice/${invoiceId}`);
  };

  const handleEdit = () => {
    if (!doc || !settings) return;
    const locked =
      ("isLocked" in doc && doc.isLocked) || ("finalizedAt" in doc && Boolean(doc.finalizedAt));
    if (locked) {
      toast.info("Finalisiert – nicht editierbar.");
      return;
    }
    setEditorSeed(buildEditorSeed(doc, docType));
    setEditorInitial({
      id: doc.id,
      number: String(doc.number ?? ""),
      date: doc.date,
      clientId: doc.clientId ?? "",
      projectId: doc.projectId ?? undefined,
      offerId: "offerId" in doc ? doc.offerId : undefined,
      dueDate: "dueDate" in doc ? doc.dueDate : undefined,
      validUntil: "validUntil" in doc ? doc.validUntil : undefined,
      positions: doc.positions ?? [],
      vatRate: Number(doc.vatRate ?? 0),
      status: doc.status,
      introText: doc.introText ?? "",
      footerText: doc.footerText ?? "",
      paymentDate: "paymentDate" in doc ? doc.paymentDate ?? undefined : undefined,
      isLocked: "isLocked" in doc ? doc.isLocked ?? false : false,
      finalizedAt: "finalizedAt" in doc ? doc.finalizedAt ?? null : null,
      sentAt: doc.sentAt ?? null,
      lastSentAt: doc.lastSentAt ?? null,
      sentCount: doc.sentCount ?? 0,
      sentVia: doc.sentVia ?? null,
      invoiceId: "invoiceId" in doc ? doc.invoiceId ?? null : null,
    });
    setEditorOpen(true);
  };

  const handleSaved = async () => {
    if (!id) return;
    const updated = docType === "invoice" ? await invoiceService.getInvoice(id) : await offerService.getOffer(id);
    if (updated) setDoc(updated);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Lade Dokument...</div>;
  }

  if (error || !doc || !settings) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error ?? "Dokument konnte nicht geladen werden."}
        </div>
        <Link to="/app/documents">
          <AppButton variant="secondary">Zurück zu Dokumenten</AppButton>
        </Link>
      </div>
    );
  }

  const docStatus = doc.status;
  const overdue = docType === "invoice" && isInvoiceOverdue(doc as Invoice);

  return (
    <div className="space-y-6 pb-24">
      {showSendModal && client && settings && (
        <SendDocumentModal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          documentType={docType}
          document={doc as Invoice | Offer}
          client={client}
          settings={settings}
          defaultSubject={defaultSubject}
          defaultMessage={defaultMessage}
          onFinalize={docType === "invoice" ? undefined : undefined}
          onSent={async (nextData) => {
            setDoc(nextData as Invoice | Offer);
          }}
        />
      )}

      {editorOpen && editorSeed && settings && (
        <DocumentEditor
          type={docType}
          seed={editorSeed}
          settings={settings}
          clients={clients}
          onClose={() => {
            setEditorOpen(false);
            setEditorSeed(null);
            setEditorInitial(null);
          }}
          onSaved={handleSaved}
          initial={editorInitial ?? undefined}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {docType === "invoice" ? "Rechnung" : "Angebot"} #{doc.number}
            </h1>
            <div className="mt-1 text-sm text-gray-600">
              {client?.companyName ?? "Unbekannter Kunde"} · {formatDate(doc.date, "de-DE")}
              {docType === "invoice" && (doc as Invoice).dueDate && (
                <>
                  {" "}· Fällig: {formatDate((doc as Invoice).dueDate ?? "", "de-DE")}
                </>
              )}
              {docType === "offer" && (doc as Offer).validUntil && (
                <>
                  {" "}· Gültig bis: {formatDate((doc as Offer).validUntil ?? "", "de-DE")}
                </>
              )}
            </div>
          </div>
          <AppBadge color={overdue ? "red" : statusTone(docStatus)}>
            {formatDocumentStatus(docType, docStatus, { isOverdue: overdue })}
          </AppBadge>
        </div>

        <div className="flex flex-wrap gap-2">
          <AppButton variant="secondary" onClick={handleDownload}>
            <FileDown size={16} /> PDF
          </AppButton>
          <AppButton variant="secondary" onClick={() => setShowSendModal(true)}>
            <Mail size={16} /> Teilen
          </AppButton>
          <AppButton variant="ghost" onClick={handleEdit}>
            <Pencil size={16} /> Bearbeiten
          </AppButton>
          <AppButton variant="ghost" onClick={() => toast.info("Weitere Aktionen folgen.")}>
            <MoreVertical size={16} /> Mehr
          </AppButton>
        </div>
      </div>

      <AppCard className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Positionen</h2>
        <div className="space-y-3">
          {(doc.positions ?? []).length === 0 ? (
            <div className="text-sm text-gray-500">Keine Positionen vorhanden.</div>
          ) : (
            (doc.positions ?? []).map((pos: Position) => (
              <div key={pos.id} className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-900">{pos.description}</div>
                  <div className="text-xs text-gray-500">
                    {toNumberOrZero(pos.quantity)} {pos.unit} · {formatCurrency(toNumberOrZero(pos.price), "de-DE", settings.currency ?? "EUR")}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(toNumberOrZero(pos.quantity) * toNumberOrZero(pos.price), "de-DE", settings.currency ?? "EUR")}
                </div>
              </div>
            ))
          )}
        </div>
      </AppCard>

      <AppCard className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Summen</h2>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Netto</span>
          <span>{formatCurrency(totals.net, "de-DE", settings.currency ?? "EUR")}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>MwSt ({toNumberOrZero(doc.vatRate)}%)</span>
          <span>{formatCurrency(totals.vat, "de-DE", settings.currency ?? "EUR")}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold text-gray-900">
          <span>Brutto</span>
          <span>{formatCurrency(totals.gross, "de-DE", settings.currency ?? "EUR")}</span>
        </div>
      </AppCard>

      <AppCard className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Details</h2>
        {docType === "invoice" ? (
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              Zahlungsziel: {(doc as Invoice).dueDate ? formatDate((doc as Invoice).dueDate ?? "", "de-DE") : "—"}
            </div>
            <div>
              Bank: {settings.bankName || "—"}
            </div>
            <div>
              IBAN: {settings.iban || "—"}
            </div>
            <div>
              BIC: {settings.bic || "—"}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Gültig bis: {(doc as Offer).validUntil ? formatDate((doc as Offer).validUntil ?? "", "de-DE") : "—"}
          </div>
        )}
      </AppCard>

      <AppCard className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
        {timeline.length === 0 ? (
          <div className="text-sm text-gray-500">Keine Aktivitäten vorhanden.</div>
        ) : (
          <div className="space-y-2">
            {timeline.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm text-gray-600">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur safe-bottom">
        <div className="app-container">
          <div className="flex flex-wrap gap-2 py-3">
            {docType === "invoice" ? (
              <>
                <AppButton onClick={handleMarkPaid} disabled={doc.status === InvoiceStatus.PAID} className="flex-1 justify-center">
                  Als bezahlt markieren
                </AppButton>
                <AppButton variant="secondary" onClick={() => setShowSendModal(true)} className="flex-1 justify-center">
                  Erinnerung senden
                </AppButton>
              </>
            ) : (
              <>
                <AppButton onClick={handleOfferAccepted} disabled={doc.status === OfferStatus.ACCEPTED} className="flex-1 justify-center">
                  Als angenommen markieren
                </AppButton>
                <AppButton
                  variant="secondary"
                  onClick={handleConvertToInvoice}
                  disabled={!canConvertToInvoice(doc as Offer)}
                  className="flex-1 justify-center"
                >
                  In Rechnung wandeln
                </AppButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
