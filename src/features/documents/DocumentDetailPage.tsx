import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, type Location } from "react-router-dom";
import { MoreVertical } from "lucide-react";

import type { Client, Invoice, Offer, Position, UserSettings } from "@/types";
import { InvoiceStatus, OfferStatus, formatDate } from "@/types";
import { formatMoney } from "@/utils/money";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { calculateDocumentTotals } from "@/domain/rules/tax";
import {
  INVOICE_FINALIZATION_ACKNOWLEDGEMENT,
  INVOICE_FINALIZATION_CONFIRMATION_MESSAGE,
} from "@/domain/rules/invoiceFinalizationNotice";
import { fetchSettings } from "@/app/settings/settingsService";
import { DeferredDialogFallback } from "@/components/DeferredDialogFallback";
import { OfferDetailView } from "@/features/documents/OfferDetailView";
import { InvoiceDetailView } from "@/features/documents/InvoiceDetailView";
import { supabase } from "@/supabaseClient";
import { formatErrorToast } from "@/utils/errorMapping";
import * as clientService from "@/app/clients/clientService";
import * as invoiceService from "@/app/invoices/invoiceService";
import * as offerService from "@/app/offers/offerService";
import { downloadDocumentPdf, downloadInvoiceCii, downloadInvoiceZugferd } from "@/app/pdf/documentPdfService";
import { createRecipientLink } from "@/app/recipient/recipientService";
import { dbListDocumentActivity } from "@/db/documentActivityDb";
import { formatDocumentStatus, formatInvoiceDisplayStatus } from "@/features/documents/utils/formatStatus";
import {
  getDocumentCapabilities,
  getInvoicePhase,
  getNextDocumentAction,
  getOfferPhase,
} from "@/features/documents/state/documentState";

const SendDocumentModal = lazy(() =>
  import("@/features/documents/SendDocumentModal").then((module) => ({
    default: module.SendDocumentModal,
  })),
);

const statusTone = (phase: string) => {
  if (phase === "paid" || phase === "accepted" || phase === "invoiced") return "green";
  if (phase === "overdue" || phase === "rejected") return "red";
  if (phase === "sent" || phase === "issued") return "blue";
  if (phase === "canceled") return "gray";
  return "gray";
};

const toNumberOrZero = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

type DocumentDetailPageProps = {
  forcedType?: "offer" | "invoice";
  onDocumentsChange?: () => void;
};

export const canCreateRecipientLink = (
  doc: Invoice | Offer | null,
  docType: "invoice" | "offer"
) =>
  Boolean(
    doc &&
      ((docType === "invoice" && Boolean((doc as Invoice).finalizedAt)) ||
        (docType === "offer" && (doc as Offer).status === OfferStatus.SENT))
  );

export const getDocumentEditPath = (type: "invoice" | "offer", id: string) =>
  `/app/documents/${type}/${id}/edit`;

type DetailActivityEvent = Awaited<ReturnType<typeof dbListDocumentActivity>>[number];
type DetailAction = {
  key: string;
  label: string;
  onSelect: () => void | Promise<void>;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

const secondaryActionPriority: Record<string, number> = {
  EDIT: 10,
  SEND_REMINDER: 20,
  SEND_INVOICE: 30,
  SEND_OFFER: 30,
  MARK_SENT: 35,
  MARK_INVOICE_PAID: 40,
  ACCEPT_OFFER: 45,
  REJECT_OFFER: 50,
  COPY_RECIPIENT_LINK: 55,
  DOWNLOAD_PDF: 70,
  DOWNLOAD_EINVOICE: 71,
  DOWNLOAD_XML: 72,
  CANCEL_INVOICE: 90,
};

export const prioritizeDocumentActions = (
  actions: DetailAction[],
  preferredAction: DetailAction | null,
) => {
  if (!preferredAction) return actions;
  return [
    { ...preferredAction, variant: "primary" as const },
    ...actions
      .filter((action) => action.key !== preferredAction.key)
      .sort(
        (left, right) =>
          (secondaryActionPriority[left.key] ?? 60) -
          (secondaryActionPriority[right.key] ?? 60),
      ),
  ];
};

export const buildDocumentTimeline = (
  doc: Invoice | Offer,
  activityEvents: DetailActivityEvent[] = []
) => {
  const items: Array<{ label: string; value: string }> = [];
  if (doc.date) items.push({ label: "Erstellt", value: formatDate(doc.date, "de-DE") });
  if ("finalizedAt" in doc && doc.finalizedAt) {
    items.push({ label: "Finalisiert", value: formatDate(doc.finalizedAt, "de-DE") });
  }
  if (doc.sentAt || doc.lastSentAt) {
    const sentDate = doc.lastSentAt ?? doc.sentAt;
    if (sentDate) items.push({ label: "Gesendet", value: formatDate(sentDate, "de-DE") });
  }
  const rejectedEvent = activityEvents.find(
    (event) => event.event_type.toUpperCase() === "REJECTED"
  );
  const acceptedEvent = activityEvents.find(
    (event) => event.event_type.toUpperCase() === "ACCEPTED"
  );
  if ("validUntil" in doc && doc.status === OfferStatus.ACCEPTED && acceptedEvent) {
    items.push({
      label: "Angebot angenommen",
      value: formatDate(acceptedEvent.created_at, "de-DE"),
    });
  }
  if ("validUntil" in doc && doc.status === OfferStatus.REJECTED && rejectedEvent) {
    items.push({
      label: "Angebot abgelehnt",
      value: formatDate(rejectedEvent.created_at, "de-DE"),
    });
  }
  if ("paymentDate" in doc && doc.paymentDate) {
    items.push({ label: "Bezahlt", value: formatDate(doc.paymentDate, "de-DE") });
  }
  return items;
};

export default function DocumentDetailPage({ forcedType, onDocumentsChange }: DocumentDetailPageProps) {
  const { type, id } = useParams<{ type?: "offer" | "invoice"; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<Invoice | Offer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activityEvents, setActivityEvents] = useState<DetailActivityEvent[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTemplateType, setSendTemplateType] = useState<
    "reminder" | "dunning" | "followup" | undefined
  >(undefined);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const docType = forcedType ?? (type === "invoice" ? "invoice" : "offer");
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientData, settingsData, documentData, documentActivity] = await Promise.all([
          clientService.list(),
          fetchSettings(),
          docType === "invoice" && id ? invoiceService.getInvoice(id) : offerService.getOffer(id ?? ""),
          id ? dbListDocumentActivity(docType, id) : Promise.resolve([]),
        ]);
        if (!mounted) return;
        setClients(clientData);
        setSettings(settingsData);
        setDoc(documentData ?? null);
        setActivityEvents(documentActivity);
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
  }, [docType, id, reloadToken]);

  useEffect(() => {
    if (!id || docType !== "offer") return;
    const channel = supabase
      .channel(`offer-recipient-response-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "offers", filter: `id=eq.${id}` }, async () => {
        const [updated, updatedActivity] = await Promise.all([
          offerService.getOffer(id),
          dbListDocumentActivity("offer", id),
        ]);
        if (updated) setDoc(updated);
        setActivityEvents(updatedActivity);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [docType, id]);

  const client = useMemo(() => {
    if (!doc) return undefined;
    if (docType === "invoice") {
      const invoice = doc as Invoice;
      return {
        id: invoice.clientId,
        companyName: invoice.clientCompanyName?.trim() || invoice.clientName?.trim() || "",
        contactPerson: invoice.clientContactPerson ?? "",
        email: invoice.clientEmail ?? "",
        address: invoice.clientAddress ?? "",
        notes: "",
      } as Client;
    }
    return clients.find((entry) => entry.id === doc.clientId);
  }, [clients, doc, docType]);

  const isSmallBusiness =
    docType === "invoice" && doc ? Boolean((doc as Invoice).isSmallBusiness) : false;

  const totals = useMemo(() => {
    if (!doc) return { net: 0, vat: 0, gross: 0 };
    const result = calculateDocumentTotals(doc.positions ?? [], toNumberOrZero(doc.vatRate), isSmallBusiness);
    return { net: result.netTotal, vat: result.taxTotal, gross: result.grossTotal };
  }, [doc, isSmallBusiness]);

  const timeline = useMemo(() => {
    if (!doc) return [];
    return buildDocumentTimeline(doc, activityEvents);
  }, [activityEvents, doc]);

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

  const runGuardedAction = async (key: string, action: () => void | Promise<void>) => {
    if (pendingActionKey) return;
    setPendingActionKey(key);
    try {
      await action();
    } finally {
      setPendingActionKey(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!doc || docType !== "invoice") return;
    if (!capabilities?.canMarkPaid) return;
    const ok = await confirm({
      title: "Zahlung erfassen",
      message: `Zahlungseingang für Rechnung ${(doc as Invoice).number ?? "Entwurf"} erfassen? Der offene Betrag wird danach als bezahlt angezeigt.`,
    });
    if (!ok) return;
    try {
      const updated = await invoiceService.markInvoicePaid((doc as Invoice).id);
      if (updated) setDoc(updated);
      onDocumentsChange?.();
      toast.success("Rechnung als bezahlt markiert.");
    } catch (error) {
      const errAny = error as Error & { code?: string; requestId?: string };
      toast.error(
        formatErrorToast({
          code: errAny.code,
          message: errAny.message,
          requestId: errAny.requestId,
          fallback: "Rechnung konnte nicht aktualisiert werden.",
        })
      );
    }
  };

  const handleMarkSent = async () => {
    if (!doc || docType !== "invoice") return;
    if (!capabilities?.canMarkSent) return;
    const ok = await confirm({
      title: "Als gesendet markieren",
      message: "Soll die Rechnung als gesendet markiert werden?",
    });
    if (!ok) return;
    try {
      const updated = await invoiceService.markInvoiceSent((doc as Invoice).id);
      if (updated) setDoc(updated);
      onDocumentsChange?.();
      toast.success("Rechnung als gesendet markiert.");
    } catch (error) {
      const errAny = error as Error & { code?: string; requestId?: string };
      toast.error(
        formatErrorToast({
          code: errAny.code,
          message: errAny.message,
          requestId: errAny.requestId,
          fallback: "Rechnung konnte nicht aktualisiert werden.",
        })
      );
    }
  };

  const handleCancelInvoice = async () => {
    if (!doc || docType !== "invoice") return;
    if (!capabilities?.canCancel) return;
    const ok = await confirm({
      title: "Rechnung stornieren",
      message: "Die Rechnung wird storniert und bleibt unverändert erhalten. Eine Gutschrift wird dabei noch nicht erstellt.",
    });
    if (!ok) return;
    try {
      const updated = await invoiceService.cancelInvoice((doc as Invoice).id);
      if (updated) setDoc(updated);
      onDocumentsChange?.();
      toast.success("Rechnung storniert.");
    } catch (error) {
      const errAny = error as Error & { code?: string; requestId?: string };
      toast.error(
        formatErrorToast({
          code: errAny.code,
          message: errAny.message,
          requestId: errAny.requestId,
          fallback: "Rechnung konnte nicht storniert werden.",
        })
      );
    }
  };

  const handleOfferAccepted = async () => {
    if (!doc || docType !== "offer") return;
    if (!capabilities?.canAccept) return;
    const offer = doc as Offer;
    const ok = await confirm({
      title: "Annahme eintragen",
      message: "Nur bestätigen, wenn der Kunde außerhalb des Empfängerportals zugesagt hat. Das Angebot wird als angenommen angezeigt.",
    });
    if (!ok) return;
    try {
      const updated = await offerService.recordOfferDecision(offer.id, "ACCEPTED");
      setDoc(updated);
      setActivityEvents(await dbListDocumentActivity("offer", offer.id));
      onDocumentsChange?.();
      toast.success("Angebot als angenommen markiert.");
    } catch (error) {
      const workflowError = error as Error & { code?: string };
      toast.error(formatErrorToast({
        code: workflowError.code,
        message: workflowError.message,
        fallback: "Annahme konnte nicht gespeichert werden.",
      }));
    }
  };

  const handleOfferRejected = async () => {
    if (!doc || docType !== "offer") return;
    if (!capabilities?.canReject) return;
    const offer = doc as Offer;
    const ok = await confirm({
      title: "Ablehnung eintragen",
      message: "Nur bestätigen, wenn der Kunde außerhalb des Empfängerportals abgesagt hat. Das Angebot wird als abgelehnt angezeigt.",
    });
    if (!ok) return;
    try {
      const updated = await offerService.recordOfferDecision(offer.id, "REJECTED");
      setDoc(updated);
      setActivityEvents(await dbListDocumentActivity("offer", offer.id));
      onDocumentsChange?.();
      toast.success("Angebot als abgelehnt markiert.");
    } catch (error) {
      const workflowError = error as Error & { code?: string };
      toast.error(formatErrorToast({
        code: workflowError.code,
        message: workflowError.message,
        fallback: "Ablehnung konnte nicht gespeichert werden.",
      }));
    }
  };

  const handleConvertToInvoice = async () => {
    if (!doc || docType !== "offer") return;
    if (!capabilities?.canConvertToInvoice) return;
    const offer = doc as Offer;
    const ok = await confirm({
      title: "Rechnung erstellen",
      message: "Aus dem angenommenen Angebot wird ein neuer Rechnungsentwurf erstellt. Kunde, Positionen und Konditionen werden automatisch übernommen.",
    });
    if (!ok) return;
    let invoiceId: string;
    try {
      invoiceId = await offerService.convertOfferToInvoice(offer.id);
    } catch (error) {
      const workflowError = error as Error & { code?: string };
      toast.error(
        formatErrorToast({
          code: workflowError.code,
          message: workflowError.message,
          fallback: "Angebot konnte nicht umgewandelt werden.",
        })
      );
      return;
    }
    onDocumentsChange?.();
    navigate(`/app/invoices/${invoiceId}`, {
      state: backgroundLocation
        ? {
            backgroundLocation,
            returnTo: returnTo ?? `${location.pathname}${location.search}`,
          }
        : undefined,
    });
  };

  const handleOpenSend = (templateType?: "reminder" | "dunning" | "followup") => {
    setSendTemplateType(templateType);
    setShowSendModal(true);
  };

  const handleDownloadInvoice = async (format: "pdf" | "zugferd" | "xml") => {
    if (!doc || docType !== "invoice") return;
    try {
      if (format === "pdf") {
        await downloadDocumentPdf({ type: "invoice", docId: doc.id });
      } else if (format === "zugferd") {
        await downloadInvoiceZugferd(doc.id);
      } else {
        await downloadInvoiceCii(doc.id);
      }
    } catch (error) {
      const err = error as Error & { code?: string; requestId?: string };
      toast.error(formatErrorToast({
        code: err.code,
        message: err.message,
        requestId: err.requestId,
        fallback: format === "xml" ? "Die E-Rechnung konnte nicht erzeugt werden." : "Das PDF konnte nicht erstellt werden.",
      }));
    }
  };

  const handleFinalizeInvoice = async () => {
    if (!doc || docType !== "invoice") return;
    if (!capabilities?.canFinalize) return;
    const invoice = doc as Invoice;
    const ok = await confirm({
      title: "Rechnung finalisieren",
      message: INVOICE_FINALIZATION_CONFIRMATION_MESSAGE,
      acknowledgementLabel: INVOICE_FINALIZATION_ACKNOWLEDGEMENT,
    });
    if (!ok) return;

    try {
      const updated = await invoiceService.finalizeInvoice(invoice.id);
      if (updated) {
        setDoc(updated);
        onDocumentsChange?.();
      }
    } catch (error) {
      const errAny = error as Error & { code?: string; requestId?: string };
      toast.error(
        formatErrorToast({
          code: errAny.code,
          message: errAny.message,
          requestId: errAny.requestId,
          fallback: "Rechnung konnte nicht finalisiert werden.",
        })
      );
      return;
    }
  };

  const handleCreateRecipientLink = async () => {
    if (!doc) return;
    try {
      const result = await createRecipientLink(docType, doc.id);
      await navigator.clipboard.writeText(result.url);
      toast.success("Empfänger-Link wurde kopiert.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Empfänger-Link konnte nicht erstellt werden.");
    }
  };

  const recipientLinkAction = canCreateRecipientLink(doc, docType)
      ? [{
          key: "COPY_RECIPIENT_LINK",
          label: "Empfänger-Link kopieren",
          onSelect: () => runGuardedAction("COPY_RECIPIENT_LINK", handleCreateRecipientLink),
        }]
      : [];

  const actions =
    docType === "invoice"
      ? [
          ...recipientLinkAction,
          ...((doc as Invoice | null)?.finalizedAt
            ? [
                {
                  key: "DOWNLOAD_PDF",
                  label: "PDF herunterladen",
                  onSelect: () => runGuardedAction("DOWNLOAD_PDF", () => handleDownloadInvoice("pdf")),
                },
                {
                  key: "DOWNLOAD_EINVOICE",
                  label: "E-Rechnung herunterladen",
                  onSelect: () => runGuardedAction("DOWNLOAD_EINVOICE", () => handleDownloadInvoice("zugferd")),
                },
                {
                  key: "DOWNLOAD_XML",
                  label: "XML herunterladen (EN 16931)",
                  onSelect: () => runGuardedAction("DOWNLOAD_XML", () => handleDownloadInvoice("xml")),
                },
              ]
            : []),
          ...(capabilities?.canFinalize
            ? [
                {
                  key: "FINALIZE_INVOICE",
                  label: "Rechnung finalisieren",
                  onSelect: () => {
                    setShowActionSheet(false);
                    return runGuardedAction("FINALIZE_INVOICE", handleFinalizeInvoice);
                  },
                },
              ]
            : []),
          ...(capabilities?.canSend
            ? [
                {
                  key: "SEND_INVOICE",
                  label: phase === "issued" ? "Rechnung senden" : "Erneut senden",
                  onSelect: () => {
                    setShowActionSheet(false);
                    handleOpenSend();
                  },
                },
              ]
            : []),
          ...(capabilities?.canMarkSent
            ? [
                {
                  key: "MARK_SENT",
                  label: "Als gesendet markieren",
                  onSelect: () => {
                    setShowActionSheet(false);
                    return runGuardedAction("MARK_SENT", handleMarkSent);
                  },
                },
              ]
            : []),
          ...(capabilities?.canSendReminder
            ? [
                {
                  key: "SEND_REMINDER",
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
                  key: "SEND_DUNNING",
                  label: "Mahnung senden",
                  onSelect: () => {
                    setShowActionSheet(false);
                    handleOpenSend("dunning");
                  },
                },
              ]
            : []),
          ...(capabilities?.canMarkPaid
            ? [
                {
                  key: "MARK_INVOICE_PAID",
                  label: "Zahlung erfassen",
                  onSelect: () => {
                    setShowActionSheet(false);
                    return runGuardedAction("MARK_INVOICE_PAID", handleMarkPaid);
                  },
                },
              ]
            : []),
          ...(capabilities?.canCancel
            ? [
                {
                  key: "CANCEL_INVOICE",
                  label: "Stornieren",
                  onSelect: () => {
                    setShowActionSheet(false);
                    return runGuardedAction("CANCEL_INVOICE", handleCancelInvoice);
                  },
                },
              ]
            : []),
          ...(capabilities?.canEdit
            ? [
                {
                  key: "EDIT",
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
          ...recipientLinkAction,
          ...(capabilities?.canSend
            ? [
                {
                  key: "SEND_OFFER",
                  label: phase === "draft" ? "Angebot senden" : "Erneut senden",
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
                  key: "REJECT_OFFER",
                  label: "Als abgelehnt markieren",
                  onSelect: () => {
                    setShowActionSheet(false);
                    return runGuardedAction("REJECT_OFFER", handleOfferRejected);
                  },
                },
              ]
            : []),
          ...(capabilities?.canAccept
            ? [
                {
                  key: "ACCEPT_OFFER",
                  label: "Als angenommen markieren",
                  onSelect: () => {
                    setShowActionSheet(false);
                    return runGuardedAction("ACCEPT_OFFER", handleOfferAccepted);
                  },
                },
              ]
            : []),
          ...(capabilities?.canConvertToInvoice
            ? [
                {
                  key: "CONVERT_OFFER",
                  label: "Rechnung aus Angebot erstellen",
                  onSelect: () => {
                    setShowActionSheet(false);
                    return runGuardedAction("CONVERT_OFFER", handleConvertToInvoice);
                  },
                },
              ]
            : []),
          ...(capabilities?.canEdit
            ? [
                {
                  key: "EDIT",
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
    if (!doc) return;
    if (!capabilities?.canEdit) {
      toast.info("Finalisiert – nicht editierbar.");
      return;
    }
    navigate(getDocumentEditPath(docType, doc.id), {
      state: { returnTo: returnTo ?? "/app/documents" },
    });
  };

  const handleSaved = async () => {
    if (!id) return;
    const updated = docType === "invoice" ? await invoiceService.getInvoice(id) : await offerService.getOffer(id);
    if (updated) setDoc(updated);
    onDocumentsChange?.();
  };

  if (loading) {
    return <AppCard className="p-6 text-sm text-[var(--app-muted)]">Dokument wird geladen …</AppCard>;
  }

  if (error || !doc || !settings) {
    return (
      <AppCard className="p-6">
        <h1 className="font-semibold">Dokument konnte nicht geöffnet werden</h1>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Das Dokument ist nicht mehr verfügbar oder die Verbindung wurde unterbrochen.</p>
        <div className="mt-4 flex flex-wrap gap-2"><AppButton onClick={() => setReloadToken((current) => current + 1)}>Erneut versuchen</AppButton><Link to="/app/documents"><AppButton variant="secondary">Zur Dokumentübersicht</AppButton></Link></div>
      </AppCard>
    );
  }

  const docStatus = doc.status;
  const overdue = phase === "overdue";
  const locale = settings.locale ?? "de-DE";
  const documentCurrency =
    docType === "offer" ? (doc as Offer).currency ?? settings.currency ?? "EUR" : settings.currency ?? "EUR";
  const nextStep = docType === "invoice"
    ? getNextDocumentAction("invoice", doc as Invoice)
    : getNextDocumentAction("offer", doc as Offer);
  const matchingWorkflowAction = nextStep
    ? actions.find((action) => action.key === nextStep.key) ?? null
    : null;
  const workflowAction: DetailAction | null = matchingWorkflowAction && nextStep
    ? { ...matchingWorkflowAction, label: nextStep.label }
    : null;
  const availableActions = prioritizeDocumentActions(actions, workflowAction).map((action) => ({
    ...action,
    disabled: Boolean(pendingActionKey),
  }));
  const directActions = availableActions.slice(0, 2);
  const overflowActions = availableActions.slice(2);

  if (docType === "offer") {
    const offer = doc as Offer;
    return (
      <div className="pb-4">
        {showSendModal && client && (
          <Suspense fallback={<DeferredDialogFallback label="Versand wird vorbereitet …" />}>
            <SendDocumentModal
              isOpen
              onClose={() => {
                setShowSendModal(false);
                setSendTemplateType(undefined);
              }}
              documentType="offer"
              document={offer}
              client={client}
              settings={settings}
              defaultSubject={defaultSubject}
              defaultMessage={defaultMessage}
              templateType={sendTemplateType}
              onSent={handleSaved}
            />
          </Suspense>
        )}

        <OfferDetailView
          offer={offer}
          client={client}
          locale={locale}
          currency={documentCurrency}
          statusLabel={formatDocumentStatus("offer", offer.status)}
          statusTone={statusTone(phase ?? String(offer.status))}
          totals={totals}
          timeline={timeline}
          canConvert={false}
          directActions={directActions}
          nextStepHint={nextStep?.hint}
          hasMoreActions={overflowActions.length > 0}
          onConvert={() => void handleConvertToInvoice()}
          onMore={() => setShowActionSheet(true)}
        />

        <ActionSheet
          isOpen={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          title="Angebotsaktionen"
          actions={overflowActions}
        />

      </div>
    );
  }

  const invoice = doc as Invoice;
  return (
    <div className="pb-4">
      {showSendModal && client && (
        <Suspense fallback={<DeferredDialogFallback label="Versand wird vorbereitet …" />}>
          <SendDocumentModal
            isOpen
            onClose={() => {
              setShowSendModal(false);
              setSendTemplateType(undefined);
            }}
            documentType="invoice"
            document={invoice}
            client={client}
            settings={settings}
            defaultSubject={defaultSubject}
            defaultMessage={defaultMessage}
            templateType={sendTemplateType}
            onSent={handleSaved}
          />
        </Suspense>
      )}

      <InvoiceDetailView
        invoice={invoice}
        client={client}
        settings={settings}
        locale={locale}
        currency={documentCurrency}
        statusLabel={formatInvoiceDisplayStatus(invoice)}
        statusTone={overdue ? "red" : statusTone(phase ?? String(invoice.status))}
        totals={totals}
        timeline={timeline}
        directActions={directActions}
        nextStepHint={nextStep?.hint}
        hasMoreActions={overflowActions.length > 0}
        onMore={() => setShowActionSheet(true)}
      />

      <ActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title="Rechnungsaktionen"
        actions={overflowActions}
      />

    </div>
  );

  /* Legacy detail markup retained temporarily for reference during the shared-view migration.
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
          onSent={async () => {
            await handleSaved();
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
            </div>
          </div>
          <AppBadge color={overdue ? "red" : statusTone(phase ?? String(docStatus))}>
            {docType === "invoice"
              ? formatInvoiceDisplayStatus(doc as Invoice)
              : formatDocumentStatus(docType, docStatus, { isOverdue: overdue })}
          </AppBadge>
        </div>

        <div className="flex flex-wrap gap-2">
          {docType === "invoice" && capabilities?.canFinalize && (
            <AppButton variant="secondary" onClick={() => void handleFinalizeInvoice()}>
              Finalisieren
            </AppButton>
          )}
          {docType === "invoice" && capabilities?.canMarkSent && (
            <AppButton variant="secondary" onClick={() => void handleMarkSent()}>
              Als gesendet markieren
            </AppButton>
          )}
          {docType === "invoice" && capabilities?.canMarkPaid && (
            <AppButton variant="secondary" onClick={() => void handleMarkPaid()}>
              Als bezahlt markieren
            </AppButton>
          )}
          {docType === "invoice" && capabilities?.canCancel && (
            <AppButton variant="secondary" onClick={() => void handleCancelInvoice()}>
              Stornieren
            </AppButton>
          )}
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
              Zahlungsziel: {(doc as Invoice).paymentTermsDays ?? 0} Tage
            </div>
            <div>
              Fällig am: {(doc as Invoice).dueDate ? formatDate((doc as Invoice).dueDate ?? "", "de-DE") : "—"}
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur safe-bottom dark:border-slate-800 dark:bg-slate-900/95">
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
  */
}
