import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MoreVertical } from "lucide-react";

import type { Client, Invoice, Offer, Position, UserSettings } from "@/types";
import { InvoiceStatus, OfferStatus, formatDate } from "@/types";
import { formatMoney } from "@/utils/money";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { calcGross, calcNet, calcVat } from "@/domain/rules/money";
import { fetchSettings } from "@/app/settings/settingsService";
import { DocumentEditor, type EditorSeed } from "@/features/documents/DocumentEditor";
import { SendDocumentModal } from "@/features/documents/SendDocumentModal";
import { supabase } from "@/supabaseClient";
import { mapErrorCodeToToast } from "@/utils/errorMapping";
import * as clientService from "@/app/clients/clientService";
import * as invoiceService from "@/app/invoices/invoiceService";
import * as offerService from "@/app/offers/offerService";
import { formatDocumentStatus } from "@/features/documents/utils/formatStatus";
import {
  getDocumentCapabilities,
  getInvoicePhase,
  getOfferPhase,
} from "@/features/documents/state/documentState";

const statusTone = (phase: string) => {
  if (phase === "paid" || phase === "accepted" || phase === "invoiced") return "green";
  if (phase === "overdue" || phase === "rejected") return "red";
  if (phase === "sent" || phase === "issued") return "blue";
  return "gray";
};

const toNumberOrZero = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const buildEditorSeed = (doc: Invoice | Offer, type: "invoice" | "offer"): EditorSeed => ({
  id: doc.id,
  number: doc.number ?? null,
  date: doc.date,
  dueDate: type === "invoice" ? (doc as Invoice).dueDate : undefined,
  validUntil: type === "offer" ? (doc as Offer).validUntil : undefined,
  vatRate: Number(doc.vatRate ?? 0),
  isSmallBusiness: type === "invoice" ? (doc as Invoice).isSmallBusiness ?? false : undefined,
  smallBusinessNote: type === "invoice" ? (doc as Invoice).smallBusinessNote ?? null : undefined,
  introText: doc.introText ?? "",
  footerText: doc.footerText ?? "",
  currency: type === "offer" ? (doc as Offer).currency ?? undefined : undefined,
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
  const [sendTemplateType, setSendTemplateType] = useState<
    "reminder" | "dunning" | "followup" | undefined
  >(undefined);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
  const [editorInitial, setEditorInitial] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  const docType = type === "invoice" ? "invoice" : "offer";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const handleChange = () => setIsMobile(mediaQuery.matches);
    handleChange();
    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

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

  const isSmallBusiness =
    docType === "invoice" && doc ? Boolean((doc as Invoice).isSmallBusiness) : false;

  const totals = useMemo(() => {
    if (!doc) return { net: 0, vat: 0, gross: 0 };
    const net = calcNet(doc.positions ?? []);
    const vat = isSmallBusiness ? 0 : calcVat(net, toNumberOrZero(doc.vatRate));
    return { net, vat, gross: isSmallBusiness ? net : calcGross(net, vat) };
  }, [doc, isSmallBusiness]);

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

  const phase = useMemo(() => {
    if (!doc) return null;
    return docType === "invoice" ? getInvoicePhase(doc as Invoice) : getOfferPhase(doc as Offer);
  }, [doc, docType]);

  const capabilities = useMemo(() => {
    if (!doc) return null;
    return docType === "invoice"
      ? getDocumentCapabilities("invoice", doc as Invoice)
      : getDocumentCapabilities("offer", doc as Offer);
  }, [doc, docType]);

  const handleMarkPaid = async () => {
    if (!doc || docType !== "invoice") return;
    if (!capabilities?.canMarkPaid) return;
    const invoice = doc as Invoice;
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
    if (!capabilities?.canAccept) return;
    const offer = doc as Offer;
    const ok = await confirm({
      title: "Angebot annehmen",
      message: "Soll das Angebot als angenommen markiert werden?",
    });
    if (!ok) return;
    await offerService.saveOffer({ ...offer, status: OfferStatus.ACCEPTED });
    setDoc({ ...offer, status: OfferStatus.ACCEPTED });
    toast.success("Angebot als angenommen markiert.");
  };

  const handleOfferRejected = async () => {
    if (!doc || docType !== "offer") return;
    if (!capabilities?.canReject) return;
    const offer = doc as Offer;
    const ok = await confirm({
      title: "Angebot ablehnen",
      message: "Soll das Angebot als abgelehnt markiert werden?",
    });
    if (!ok) return;
    await offerService.saveOffer({ ...offer, status: OfferStatus.REJECTED });
    setDoc({ ...offer, status: OfferStatus.REJECTED });
    toast.success("Angebot als abgelehnt markiert.");
  };

  const handleConvertToInvoice = async () => {
    if (!doc || docType !== "offer") return;
    if (!capabilities?.canConvertToInvoice) return;
    const offer = doc as Offer;
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

  const handleOpenSend = (templateType?: "reminder" | "dunning" | "followup") => {
    setSendTemplateType(templateType);
    setShowSendModal(true);
  };

  const handleFinalizeInvoice = async () => {
    if (!doc || docType !== "invoice") return;
    if (!capabilities?.canFinalize) return;
    const invoice = doc as Invoice;
    const ok = await confirm({
      title: "Rechnung finalisieren",
      message: "Nach dem Ausstellen sind Inhalt/Positionen gesperrt. Korrekturen nur per Gutschrift/Storno.",
    });
    if (!ok) return;

    try {
      await invoiceService.finalizeInvoice(invoice.id);
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      toast.error(
        mapErrorCodeToToast(code ?? error.message) || "Rechnung konnte nicht finalisiert werden."
      );
      return;
    }

    const updated = await invoiceService.getInvoice(invoice.id);
    if (!updated) {
      toast.error("Rechnung konnte nicht geladen werden.");
      return;
    }
    setDoc(updated);
  };

  const actions =
    docType === "invoice"
      ? [
          ...(capabilities?.canFinalize
            ? [
                {
                  label: "Finalisieren",
                  onSelect: () => {
                    setShowActionSheet(false);
                    void handleFinalizeInvoice();
                  },
                },
              ]
            : []),
          ...(capabilities?.canSend
            ? [
                {
                  label: "Senden",
                  onSelect: () => {
                    setShowActionSheet(false);
                    handleOpenSend();
                  },
                },
              ]
            : []),
          ...(capabilities?.canSendReminder
            ? [
                {
                  label: "Erinnerung senden",
                  onSelect: () => {
                    setShowActionSheet(false);
                    handleOpenSend("reminder");
                  },
                },
              ]
            : []),
          ...(capabilities?.canSendDunning
            ? [
                {
                  label: "Mahnung senden",
                  onSelect: () => {
                    setShowActionSheet(false);
                    handleOpenSend("dunning");
                  },
                },
              ]
            : []),
          ...(capabilities?.canEdit
            ? [
                {
                  label: "Bearbeiten",
                  onSelect: () => {
                    setShowActionSheet(false);
                    handleEdit();
                  },
                },
              ]
            : []),
        ]
      : [
          ...(capabilities?.canSend
            ? [
                {
                  label: "Senden",
                  onSelect: () => {
                    setShowActionSheet(false);
                    handleOpenSend();
                  },
                },
              ]
            : []),
          ...(capabilities?.canReject
            ? [
                {
                  label: "Ablehnen",
                  onSelect: () => {
                    setShowActionSheet(false);
                    void handleOfferRejected();
                  },
                },
              ]
            : []),
          ...(capabilities?.canConvertToInvoice
            ? [
                {
                  label: "In Rechnung wandeln",
                  onSelect: () => {
                    setShowActionSheet(false);
                    void handleConvertToInvoice();
                  },
                },
              ]
            : []),
          ...(capabilities?.canEdit
            ? [
                {
                  label: "Bearbeiten",
                  onSelect: () => {
                    setShowActionSheet(false);
                    handleEdit();
                  },
                },
              ]
            : []),
        ];

  const handleEdit = () => {
    if (!doc || !settings) return;
    if (!capabilities?.canEdit) {
      toast.info("Finalisiert – nicht editierbar.");
      return;
    }
    if (isMobile) {
      navigate(`/app/documents/${docType}/${doc.id}/edit`);
      return;
    }
    setEditorSeed(buildEditorSeed(doc, docType));
    setEditorInitial({
      id: doc.id,
      number: doc.number ?? null,
      date: doc.date,
      clientId: doc.clientId ?? "",
      projectId: doc.projectId ?? undefined,
      offerId: "offerId" in doc ? doc.offerId : undefined,
      dueDate: "dueDate" in doc ? doc.dueDate : undefined,
      validUntil: "validUntil" in doc ? doc.validUntil : undefined,
      positions: doc.positions ?? [],
      vatRate: Number(doc.vatRate ?? 0),
      isSmallBusiness: "isSmallBusiness" in doc ? doc.isSmallBusiness ?? false : false,
      smallBusinessNote: "smallBusinessNote" in doc ? doc.smallBusinessNote ?? null : null,
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
      currency: "currency" in doc ? doc.currency ?? undefined : undefined,
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
  const overdue = phase === "overdue";
  const locale = settings.locale ?? "de-DE";
  const documentCurrency =
    docType === "offer" ? (doc as Offer).currency ?? settings.currency ?? "EUR" : settings.currency ?? "EUR";
  const primaryAction =
    docType === "invoice" && capabilities?.canMarkPaid
      ? {
          label: "Als bezahlt markieren",
          onClick: handleMarkPaid,
        }
      : docType === "offer" && capabilities?.canAccept
        ? {
            label: "Als angenommen markieren",
            onClick: handleOfferAccepted,
          }
        : null;

  return (
    <div className="space-y-6 pb-24">
      {showSendModal && client && settings && (
        <SendDocumentModal
          isOpen={showSendModal}
          onClose={() => {
            setShowSendModal(false);
            setSendTemplateType(undefined);
          }}
          documentType={docType}
          document={doc as Invoice | Offer}
          client={client}
          settings={settings}
          defaultSubject={defaultSubject}
          defaultMessage={defaultMessage}
          templateType={sendTemplateType}
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
              {docType === "invoice" ? "Rechnung" : "Angebot"} #
              {docType === "invoice" ? doc.number ?? "Entwurf" : doc.number ?? ""}
            </h1>
            <div className="mt-1 text-sm text-gray-600">
              {client?.companyName ?? "Unbekannter Kunde"} · {formatDate(doc.date, locale)}
              {docType === "invoice" && (doc as Invoice).dueDate && (
                <>
                  {" "}· Fällig: {formatDate((doc as Invoice).dueDate ?? "", locale)}
                </>
              )}
              {docType === "offer" && (doc as Offer).validUntil && (
                <>
                  {" "}· Gültig bis: {formatDate((doc as Offer).validUntil ?? "", locale)}
                </>
              )}
            </div>
          </div>
          <AppBadge color={overdue ? "red" : statusTone(phase ?? String(docStatus))}>
            {formatDocumentStatus(docType, docStatus, { isOverdue: overdue })}
          </AppBadge>
        </div>

        <div className="flex flex-wrap gap-2">
          <AppButton variant="ghost" onClick={() => setShowActionSheet(true)}>
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
                    {toNumberOrZero(pos.quantity)} {pos.unit} · {formatMoney(toNumberOrZero(pos.price), documentCurrency, locale)}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatMoney(toNumberOrZero(pos.quantity) * toNumberOrZero(pos.price), documentCurrency, locale)}
                </div>
              </div>
            ))
          )}
        </div>
      </AppCard>

      <AppCard className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Summen</h2>
        {isSmallBusiness ? (
          <div className="flex items-center justify-between text-base font-semibold text-gray-900">
            <span>Gesamtbetrag</span>
            <span>{formatMoney(totals.gross, documentCurrency, locale)}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Netto</span>
              <span>{formatMoney(totals.net, documentCurrency, locale)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>MwSt ({toNumberOrZero(doc.vatRate)}%)</span>
              <span>{formatMoney(totals.vat, documentCurrency, locale)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-gray-900">
              <span>Brutto</span>
              <span>{formatMoney(totals.gross, documentCurrency, locale)}</span>
            </div>
          </>
        )}
        {isSmallBusiness && "smallBusinessNote" in doc && doc.smallBusinessNote && (
          <p className="text-xs text-gray-500">{doc.smallBusinessNote}</p>
        )}
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

      <ActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title="Aktionen"
        actions={actions}
      />

      {primaryAction && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur safe-bottom">
          <div className="app-container">
            <div className="flex flex-wrap gap-2 py-3">
              <AppButton onClick={primaryAction.onClick} className="flex-1 justify-center">
                {primaryAction.label}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
