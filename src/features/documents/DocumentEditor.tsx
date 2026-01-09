// src/features/documents/DocumentEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Trash2, Plus, FileDown, Mail, ArrowLeft, Settings } from "lucide-react";

import type { Client, UserSettings, Position } from "@/types";
import { InvoiceStatus, OfferStatus, formatDate } from "@/types";
import { formatMoney } from "@/utils/money";

import { AppButton } from "@/ui/AppButton";
import { Alert } from "@/ui/Alert";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { ActivityTimeline } from "@/features/documents/ActivityTimeline";
import { SendDocumentModal } from "@/features/documents/SendDocumentModal";
import { supabase } from "@/supabaseClient";
import { mapErrorCodeToToast } from "@/utils/errorMapping";

import * as offerService from "@/app/offers/offerService";
import * as invoiceService from "@/app/invoices/invoiceService";
import { calcGross, calcNet, calcVat } from "@/domain/rules/money";
import { downloadDocumentPdf } from "@/app/pdf/documentPdfService";
import { canConvertToInvoice } from "@/domain/rules/offerRules";
import { formatDocumentStatus } from "@/features/documents/utils/formatStatus";
import { ApiRequestError, getErrorMessage, logError } from "@/utils/errors";

export type EditorSeed = {
  id: string;
  number: string | null;
  date: string;
  paymentTermsDays?: number;
  dueDate?: string;
  validUntil?: string;
  vatRate: number;
  isSmallBusiness?: boolean;
  smallBusinessNote?: string | null;
  introText: string;
  footerText: string;
  currency?: string;
};

type FormData = {
  id: string;
  number: string | null;
  date: string;
  paymentTermsDays?: number;
  dueDate?: string;
  validUntil?: string;
  clientId: string;
  clientName?: string;
  clientCompanyName?: string | null;
  clientContactPerson?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientVatId?: string | null;
  clientAddress?: string | null;
  positions: Position[];
  introText: string;
  footerText: string;
  status: InvoiceStatus | OfferStatus;
  vatRate: number;
  isSmallBusiness?: boolean;
  smallBusinessNote?: string | null;
  currency?: string;
  paymentDate?: string;
  paidAt?: string | null;
  canceledAt?: string | null;
  offerId?: string;
  projectId?: string;
  isLocked?: boolean;
  finalizedAt?: string | null;
  sentAt?: string | null;
  lastSentAt?: string | null;
  lastSentTo?: string | null;
  sentCount?: number;
  sentVia?: "EMAIL" | "MANUAL" | "EXPORT" | null;
  invoiceId?: string | null;
};

function toNumberOrZero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function applyTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => data[key] ?? match);
}

function buildSnapshotFromClient(client?: Client | null) {
  const companyName = client?.companyName ?? "";
  const contactPerson = client?.contactPerson ?? "";
  return {
    clientName: companyName.trim() ? companyName : contactPerson,
    clientCompanyName: companyName,
    clientContactPerson: contactPerson,
    clientEmail: client?.email ?? "",
    clientPhone: null,
    clientVatId: null,
    clientAddress: client?.address ?? "",
  };
}

function buildFormData(
  seed: EditorSeed,
  initial: Partial<FormData> | undefined,
  isInvoice: boolean,
  defaultCurrency?: string
): FormData {
  const base: FormData = {
    id: seed.id,
    number: seed.number ?? null,
    date: seed.date,
    paymentTermsDays: seed.paymentTermsDays ?? 14,
    dueDate: seed.dueDate,
    validUntil: seed.validUntil,
    clientId: "",
    clientName: "",
    clientCompanyName: "",
    clientContactPerson: "",
    clientEmail: "",
    clientPhone: null,
    clientVatId: null,
    clientAddress: "",
    positions: [],
    introText: seed.introText ?? "",
    footerText: seed.footerText ?? "",
    status: isInvoice ? InvoiceStatus.DRAFT : OfferStatus.DRAFT,
    vatRate: seed.vatRate ?? 0,
    isSmallBusiness: seed.isSmallBusiness ?? false,
    smallBusinessNote: seed.smallBusinessNote ?? "",
    currency: isInvoice ? undefined : defaultCurrency ?? "EUR",
    paymentDate: undefined,
    offerId: undefined,
    projectId: undefined,
    isLocked: false,
    finalizedAt: null,
    sentAt: null,
    lastSentAt: null,
    lastSentTo: null,
    sentCount: 0,
    sentVia: null,
    invoiceId: null,
  };

  const merged = { ...base, ...(initial ?? {}) };

  return {
    ...merged,
    clientId: merged.clientId ?? "",
    clientName: merged.clientName ?? "",
    clientCompanyName: merged.clientCompanyName ?? "",
    clientContactPerson: merged.clientContactPerson ?? "",
    clientEmail: merged.clientEmail ?? "",
    clientPhone: merged.clientPhone ?? null,
    clientVatId: merged.clientVatId ?? null,
    clientAddress: merged.clientAddress ?? "",
    positions: Array.isArray(merged.positions) ? (merged.positions as Position[]) : [],
    introText: merged.introText ?? "",
    footerText: merged.footerText ?? "",
    vatRate: Number(merged.vatRate ?? 0),
    paymentTermsDays: Number(merged.paymentTermsDays ?? 14),
    isSmallBusiness: Boolean(merged.isSmallBusiness ?? false),
    smallBusinessNote: merged.smallBusinessNote ?? "",
    currency: isInvoice ? undefined : merged.currency ?? defaultCurrency ?? "EUR",
  };
}

export function DocumentEditor({
  type,
  seed,
  settings,
  clients,
  onClose,
  onSaved,
  initial,
  readOnly = false,
  startInPrint = false,
  layout = "modal",
  showTabs = true,
  actionMode = "full",
  primaryActionLabel = "Speichern",
  disableOfferWizard = false,
  showHeader = true,
  onDirtyChange,
}: {
  type: "offer" | "invoice";
  seed: EditorSeed;
  settings: UserSettings;
  clients: Client[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  initial?: Partial<FormData>;
  readOnly?: boolean;
  startInPrint?: boolean;
  layout?: "modal" | "page" | "embedded";
  showTabs?: boolean;
  actionMode?: "full" | "save-only";
  primaryActionLabel?: string;
  disableOfferWizard?: boolean;
  showHeader?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const isInvoice = type === "invoice";
  const isPageLayout = layout === "page";
  const isEmbeddedLayout = layout === "embedded";
  const showStatusActions = actionMode === "full";

  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [showPrint, setShowPrint] = useState(startInPrint);
  const [showSendModal, setShowSendModal] = useState(false);
  const [pdfError, setPdfError] = useState<{ status?: number; message: string } | null>(null);

  const [formData, setFormData] = useState<FormData>(() =>
    buildFormData(seed, initial, isInvoice, settings.currency)
  );
  const [initialFormData, setInitialFormData] = useState<FormData>(() =>
    buildFormData(seed, initial, isInvoice, settings.currency)
  );
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");

  // ✅ WICHTIG: wenn seed/initial wechseln (Viewer lädt async), state neu setzen
  useEffect(() => {
    const next = buildFormData(seed, initial, isInvoice, settings.currency);
    setFormData(next);
    setInitialFormData(next);
    setActiveTab("details");
    setShowPrint(startInPrint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.id, startInPrint, settings.currency]);

  useEffect(() => {
    // initial kann nachträglich gesetzt werden (async)
    if (initial) {
      setFormData((prev) => {
        const next = buildFormData({ ...seed }, { ...prev, ...initial }, isInvoice, settings.currency);
        setInitialFormData(next);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, settings.currency]);

  useEffect(() => {
    if (!onDirtyChange) return;
    const dirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    onDirtyChange(dirty);
  }, [formData, initialFormData, onDirtyChange]);

  const locked = Boolean(formData.isLocked);
  const disabled = readOnly || locked || saving;
  const invoiceMetaDisabled = disabled || (isInvoice && formData.status !== InvoiceStatus.DRAFT);
  const currencyOptions = ["EUR", "USD", "CHF", "GBP"];
  const documentCurrency = isInvoice
    ? settings.currency ?? "EUR"
    : formData.currency ?? settings.currency ?? "EUR";
  const locale = settings.locale ?? "de-DE";
  const showOfferWizard =
    !disableOfferWizard &&
    !isInvoice &&
    !readOnly &&
    formData.status === OfferStatus.DRAFT &&
    !formData.invoiceId;
  const isSmallBusiness = isInvoice && Boolean(formData.isSmallBusiness);
  const selectedClient = clients.find((c) => c.id === formData.clientId);
  const invoiceSnapshotClient = useMemo(() => {
    if (!isInvoice) return undefined;
    return {
      id: formData.clientId,
      companyName: formData.clientCompanyName?.trim() || formData.clientName?.trim() || "",
      contactPerson: formData.clientContactPerson ?? "",
      email: formData.clientEmail ?? "",
      address: formData.clientAddress ?? "",
      notes: "",
    } as Client;
  }, [
    formData.clientAddress,
    formData.clientCompanyName,
    formData.clientContactPerson,
    formData.clientEmail,
    formData.clientId,
    formData.clientName,
    isInvoice,
  ]);
  const displayClient = isInvoice ? invoiceSnapshotClient : selectedClient;

  const handleClientChange = (clientId: string) => {
    if (!isInvoice || readOnly || locked || formData.status !== InvoiceStatus.DRAFT) {
      setFormData((prev) => ({ ...prev, clientId }));
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    const snapshot = client ? buildSnapshotFromClient(client) : buildSnapshotFromClient();
    setFormData((prev) => ({ ...prev, clientId, ...snapshot }));
  };
  const { defaultSubject, defaultMessage } = useMemo(
    () => buildTemplateDefaults(formData),
    [
      formData,
      isInvoice,
      settings.emailDefaultSubject,
      settings.emailDefaultText,
      settings.companyName,
      clients,
    ]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("offer-wizard-open", showOfferWizard);
    return () => {
      document.body.classList.remove("offer-wizard-open");
    };
  }, [showOfferWizard]);


  const addPosition = () => {
    if (readOnly || locked) return;
    setFormData((prev) => ({
      ...prev,
      positions: [
        ...(prev.positions ?? []),
        { id: newId(), description: "", quantity: 1, unit: "Std", price: 0 },
      ],
    }));
  };

  const updatePosition = (index: number, field: keyof Position, value: any) => {
    if (readOnly || locked) return;
    setFormData((prev) => {
      const positions = [...(prev.positions ?? [])];
      positions[index] = { ...positions[index], [field]: value };
      return { ...prev, positions };
    });
  };

  const removePosition = (index: number) => {
    if (readOnly || locked) return;
    setFormData((prev) => ({
      ...prev,
      positions: (prev.positions ?? []).filter((_, i) => i !== index),
    }));
  };

  const totals = useMemo(() => {
    const subtotal = calcNet(formData.positions ?? []);
    const tax = isSmallBusiness ? 0 : calcVat(subtotal, toNumberOrZero(formData.vatRate));
    return { subtotal, tax, total: isSmallBusiness ? subtotal : calcGross(subtotal, tax) };
  }, [formData.positions, formData.vatRate, isSmallBusiness]);

  useEffect(() => {
    if (!isInvoice || readOnly || locked || formData.status !== InvoiceStatus.DRAFT) return;
    if (!formData.date) return;
    const nextDueDate = invoiceService.buildDueDate(
      formData.date,
      Number(formData.paymentTermsDays ?? 0)
    );
    if (nextDueDate === formData.dueDate) return;
    setFormData((prev) => ({ ...prev, dueDate: nextDueDate }));
  }, [formData.date, formData.paymentTermsDays, formData.dueDate, isInvoice, readOnly, locked]);

  const handleSave = async (opts?: {
    closeAfterSave?: boolean;
    data?: FormData;
    allowLocked?: boolean;
  }): Promise<boolean> => {
    if (readOnly || (!opts?.allowLocked && locked)) return false;

    const closeAfterSave = opts?.closeAfterSave ?? true;
    const data = opts?.data ?? formData;

    if (!data.clientId) {
      toast.error("Bitte Kunde wählen");
      return false;
    }
    if (!isInvoice && !data.validUntil) {
      toast.error("Bitte Gültig-bis Datum setzen");
      return false;
    }

    setSaving(true);
    try {
      if (isInvoice) {
        await invoiceService.saveInvoice({
          id: data.id,
          number: data.number,
          offerId: data.offerId,
          clientId: data.clientId,
          clientName: data.clientName ?? "",
          clientCompanyName: data.clientCompanyName ?? "",
          clientContactPerson: data.clientContactPerson ?? "",
          clientEmail: data.clientEmail ?? "",
          clientPhone: data.clientPhone ?? null,
          clientVatId: data.clientVatId ?? null,
          clientAddress: data.clientAddress ?? "",
          projectId: data.projectId,
          date: data.date,
          paymentTermsDays: Number(data.paymentTermsDays ?? 14),
          positions: data.positions ?? [],
          vatRate: toNumberOrZero(data.vatRate),
          isSmallBusiness: data.isSmallBusiness ?? false,
          smallBusinessNote: data.smallBusinessNote ?? "",
          status: (data.status as InvoiceStatus) ?? InvoiceStatus.DRAFT,
          paymentDate: data.paymentDate,
          introText: data.introText ?? "",
          footerText: data.footerText ?? "",
          isLocked: data.isLocked ?? false,
          finalizedAt: data.finalizedAt ?? null,
          sentAt: data.sentAt ?? null,
          lastSentAt: data.lastSentAt ?? null,
          lastSentTo: data.lastSentTo ?? null,
          sentCount: data.sentCount ?? 0,
          sentVia: data.sentVia ?? null,
        });
      } else {
        await offerService.saveOffer({
          id: data.id,
          number: data.number,
          clientId: data.clientId,
          projectId: data.projectId,
          currency: data.currency ?? settings.currency ?? "EUR",
          date: data.date,
          validUntil: data.validUntil!,
          positions: data.positions ?? [],
          vatRate: toNumberOrZero(data.vatRate),
          introText: data.introText ?? "",
          footerText: data.footerText ?? "",
          status: (data.status as OfferStatus) ?? OfferStatus.DRAFT,
          sentAt: data.sentAt ?? null,
          lastSentAt: data.lastSentAt ?? null,
          lastSentTo: data.lastSentTo ?? null,
          sentCount: data.sentCount ?? 0,
          sentVia: data.sentVia ?? null,
          invoiceId: data.invoiceId ?? null,
        });
      }

      await onSaved();
      const savedState = buildFormData(seed, data, isInvoice, settings.currency);
      setFormData(savedState);
      setInitialFormData(savedState);

      if (closeAfterSave) onClose();
      return true;
    } catch (error) {
      let code = (error as Error & { code?: string }).code;
      if (!code && error instanceof Error) {
        code = error.message;
      }
      const message =
        mapErrorCodeToToast(code) ||
        getErrorMessage(error, "Dokument konnte nicht gespeichert werden.");
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfError(null);
    try {
      await downloadDocumentPdf({
        type: isInvoice ? "invoice" : "offer",
        docId: formData.id,
      });
    } catch (error) {
      logError(error);
      const status = error instanceof ApiRequestError ? error.status : undefined;
      const message =
        status === 401
          ? "Session abgelaufen – bitte neu einloggen."
          : status === 403
          ? "Kein Zugriff auf dieses Dokument."
          : status === 404
          ? "Dokument nicht gefunden."
          : getErrorMessage(error, "PDF konnte nicht erstellt werden.");
      setPdfError({ status, message });
      toast.error(message);
    }
  };

  function buildTemplateDefaults(data: FormData) {
    const client = isInvoice
      ? ({
          id: data.clientId,
          companyName: data.clientCompanyName?.trim() || data.clientName?.trim() || "",
          contactPerson: data.clientContactPerson ?? "",
          email: data.clientEmail ?? "",
          address: data.clientAddress ?? "",
          notes: "",
        } as Client)
      : clients.find((c) => c.id === data.clientId);
    const templateData = {
      dokument: isInvoice ? "Rechnung" : "Angebot",
      nummer: data.number ?? "",
      datum: data.date ?? "",
      kunde: client?.companyName ?? "",
      firma: settings.companyName ?? "",
    };
    const defaultSubjectTemplate =
      settings.emailDefaultSubject?.trim() || `${isInvoice ? "Rechnung" : "Angebot"} {nummer}`;
    const defaultSubject = applyTemplate(defaultSubjectTemplate, templateData);
    const defaultMessageTemplate =
      settings.emailDefaultText?.trim() || "Bitte im Anhang finden Sie das Dokument.";
    const defaultMessage = applyTemplate(defaultMessageTemplate, templateData);

    return { defaultSubject, defaultMessage };
  }

  const handleSendSuccess = async () => {
    const refreshed = isInvoice
      ? await invoiceService.getInvoice(formData.id)
      : await offerService.getOffer(formData.id);
    if (refreshed) {
      setFormData(refreshed as FormData);
    }
    await onSaved();
  };

  const validateFinalizeInvoice = () => {
    if (!formData.clientId) {
      toast.error("Bitte Kunde wählen");
      return false;
    }
    if (!formData.clientName?.trim()) {
      toast.error("Bitte Kunde auswählen");
      return false;
    }
    if (!formData.date) {
      toast.error("Bitte Rechnungsdatum setzen");
      return false;
    }
    if (!formData.clientAddress?.trim()) {
      toast.error("Bitte Kundenadresse hinterlegen");
      return false;
    }
    if (!settings.address?.trim()) {
      toast.error("Bitte Absenderadresse in den Einstellungen ergänzen");
      return false;
    }
    if (!settings.taxId?.trim()) {
      toast.error("Bitte Steuernummer in den Einstellungen ergänzen");
      return false;
    }
    if (!Number.isFinite(formData.vatRate)) {
      if (!isSmallBusiness) {
        toast.error("Bitte einen gültigen MwSt.-Satz setzen");
        return false;
      }
    }
    const paymentTermsDays = Number(formData.paymentTermsDays ?? settings.defaultPaymentTerms ?? 14);
    if (!Number.isFinite(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365) {
      toast.error("Bitte Zahlungsziel zwischen 0 und 365 Tagen setzen");
      return false;
    }
    if ((formData.positions ?? []).length === 0) {
      toast.error("Bitte mindestens eine Position hinzufügen");
      return false;
    }
    return true;
  };

  const handleFinalizeInvoice = async (): Promise<FormData | null> => {
    if (!isInvoice || readOnly || locked) return;
    if (!validateFinalizeInvoice()) return;

    const ok = await confirm({
      title: "Rechnung finalisieren",
      message:
        "Nach dem Ausstellen sind Inhalt/Positionen gesperrt. Korrekturen nur per Gutschrift/Storno.",
    });
    if (!ok) return;

    try {
      const updated = await invoiceService.finalizeInvoice(formData.id);
      if (updated) {
        setFormData({ ...formData, ...updated });
      }
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      toast.error(
        mapErrorCodeToToast(code ?? error.message) || "Rechnung konnte nicht finalisiert werden."
      );
      return null;
    }
    const refreshed = await invoiceService.getInvoice(formData.id);
    if (!refreshed) {
      toast.error("Rechnung konnte nicht geladen werden.");
      return null;
    }

    const nextData: FormData = {
      ...formData,
      ...refreshed,
    };
    setFormData(nextData);
    await onSaved();
    return nextData;
  };

  const applyOfferUpdate = async (patch: Partial<FormData>) => {
    if (readOnly || locked) return;
    const nextData = { ...formData, ...patch };
    setFormData(nextData);
    const ok = await handleSave({ closeAfterSave: false, data: nextData });
    if (ok) await onSaved();
  };

  const handleMarkOfferSentManual = async () => {
    const nowIso = new Date().toISOString();
    await applyOfferUpdate({
      status: OfferStatus.SENT,
      sentAt: formData.sentAt ?? nowIso,
      lastSentAt: nowIso,
      sentCount: (formData.sentCount ?? 0) + 1,
      sentVia: "MANUAL",
    });
  };

  const handleMarkOfferAccepted = async () => {
    await applyOfferUpdate({ status: OfferStatus.ACCEPTED });
  };

  const handleMarkOfferDeclined = async () => {
    await applyOfferUpdate({ status: OfferStatus.REJECTED });
  };

  const handleCreateInvoiceFromOffer = async () => {
    if (!canConvertToInvoice(formData as any)) {
      toast.error("Dieses Angebot kann nicht mehr umgewandelt werden.");
      return;
    }
    const ok = await confirm({
      title: "Rechnung erstellen",
      message: "Angebot in Rechnung umwandeln?",
    });
    if (!ok) return;

    const { data, error } = await supabase.rpc("convert_offer_to_invoice", {
      offer_id: formData.id,
    });

    if (error) {
      toast.error(
        mapErrorCodeToToast(error.code ?? error.message) ||
          "Angebot konnte nicht umgewandelt werden."
      );
      return;
    }

    const invoiceId = data?.id;
    if (!invoiceId) {
      toast.error("Rechnung konnte nicht erstellt werden.");
      return;
    }

    await onSaved();
    onClose();
    navigate("/app/documents?mode=invoices", { state: { openId: invoiceId } });
  };

  const sendModal = (
    <SendDocumentModal
      isOpen={showSendModal}
      onClose={() => setShowSendModal(false)}
      documentType={isInvoice ? "invoice" : "offer"}
      document={formData as any}
      client={displayClient}
      settings={settings}
      defaultSubject={defaultSubject}
      defaultMessage={defaultMessage}
      onFinalize={isInvoice ? handleFinalizeInvoice : undefined}
      onSent={async () => {
        await handleSendSuccess();
      }}
    />
  );

  // ---------- Print Overlay ----------
  if (showPrint) {
    const client = displayClient;

    return (
      <div className="fixed inset-0 bg-white z-50 overflow-hidden">
        {sendModal}
        <div className="flex h-full min-h-[100vh] min-h-[100dvh] flex-col">
          <div className="flex-1 overflow-y-auto safe-top safe-area-container bottom-action-spacer">
            <div className="w-full max-w-none px-4 pt-4 bottom-action-spacer sm:max-w-[210mm] sm:mx-auto sm:p-[10mm] sm:pb-[10mm] bg-white shadow-none print:shadow-none">
              <div className="no-print flex flex-col gap-3 mb-8 p-4 bg-gray-100 rounded-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="hidden sm:flex flex-wrap gap-2 sm:justify-end">
                  <AppButton variant="secondary" onClick={() => void handleDownloadPdf()}>
                    <FileDown size={16} /> PDF herunterladen
                  </AppButton>

                  <AppButton
                    variant="secondary"
                    onClick={() => setShowSendModal(true)}
                  >
                    <Mail size={16} /> E-Mail
                  </AppButton>

                  <AppButton
                    variant="secondary"
                    aria-label={readOnly ? "Schließen" : undefined}
                    onClick={() => {
                      if (readOnly) onClose();
                      else setShowPrint(false);
                    }}
                  >
                    <X size={16} aria-hidden="true" /> {readOnly ? "Schließen" : "Zurück zum Editor"}
                  </AppButton>
                </div>
              </div>
              {pdfError && (
                <div className="no-print mb-6">
                  <Alert
                    tone="error"
                    message={pdfError.message}
                    action={
                      pdfError.status === 401 ? (
                        <Link to="/login">
                          <AppButton variant="secondary">Zum Login</AppButton>
                        </Link>
                      ) : undefined
                    }
                  />
                </div>
              )}

              <div className="flex justify-between mb-12">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{settings.companyName}</h1>
                  <p className="text-sm text-gray-500 whitespace-pre-line">{settings.address}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {isInvoice ? "RECHNUNG" : "ANGEBOT"}
                  </h2>
                  <p className="text-gray-500">
                    Nr: {formData.number ?? (isInvoice ? "Wird bei Finalisierung vergeben" : "-")}
                  </p>
                  <p className="text-gray-500">Datum: {formatDate(formData.date, locale)}</p>
                  {isInvoice && formData.dueDate && (
                    <p className="text-gray-500">Fällig: {formatDate(formData.dueDate, locale)}</p>
                  )}
                  {!isInvoice && formData.validUntil && (
                    <p className="text-gray-500">Gültig bis: {formatDate(formData.validUntil, locale)}</p>
                  )}
                </div>
              </div>

              <div className="mb-12">
                <p className="text-xs text-gray-400 mb-2 underline">
                  {settings.companyName} • {settings.address.split("\n")[0]}
                </p>
                <div className="font-medium text-gray-900">
                  {client?.companyName || "—"}
                  <br />
                  {client?.contactPerson && (
                    <>
                      {client.contactPerson}
                      <br />
                    </>
                  )}
                  {(client?.address ?? "").split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-bold text-lg mb-2">
                  {isInvoice
                    ? `Rechnung ${formData.number ?? "Entwurf"}`
                    : `Angebot ${formData.number ?? ""}`}
                </h3>

                {formData.introText && (
                  <p className="mb-6 whitespace-pre-line text-sm">{formData.introText}</p>
                )}

                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="py-2 w-1/2">Beschreibung</th>
                      <th className="py-2 text-right">Menge</th>
                      <th className="py-2 text-right">Einzelpreis</th>
                      <th className="py-2 text-right">Gesamt</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(formData.positions ?? []).map((pos, idx) => (
                      <tr key={pos.id ?? idx} className="border-b border-gray-50">
                        <td className="py-3 pr-4">{pos.description}</td>
                        <td className="py-3 text-right">
                          {toNumberOrZero(pos.quantity)} {pos.unit}
                        </td>
                        <td className="py-3 text-right">{formatMoney(toNumberOrZero(pos.price), documentCurrency, locale)}</td>
                        <td className="py-3 text-right font-medium">
                          {formatMoney(
                            toNumberOrZero(pos.quantity) * toNumberOrZero(pos.price),
                            documentCurrency,
                            locale
                          )}
                        </td>
                      </tr>
                    ))}
                    {(formData.positions ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-400">
                          Keine Positionen
                        </td>
                      </tr>
                    )}
                  </tbody>

                  <tfoot className="border-t-2 border-gray-200">
                    {isSmallBusiness ? (
                      <tr>
                        <td colSpan={3} className="pt-4 text-right font-bold text-lg">
                          Gesamtbetrag:
                        </td>
                        <td className="pt-4 text-right font-bold text-lg">
                          {formatMoney(totals.total, documentCurrency, locale)}
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr>
                          <td colSpan={3} className="pt-4 text-right">
                            Zwischensumme:
                          </td>
                          <td className="pt-4 text-right">{formatMoney(totals.subtotal, documentCurrency, locale)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="text-right text-gray-500">
                            Umsatzsteuer ({toNumberOrZero(formData.vatRate)}%):
                          </td>
                          <td className="text-right text-gray-500">{formatMoney(totals.tax, documentCurrency, locale)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="pt-2 text-right font-bold text-lg">
                            Gesamtsumme:
                          </td>
                          <td className="pt-2 text-right font-bold text-lg">{formatMoney(totals.total, documentCurrency, locale)}</td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
                </div>
                {isSmallBusiness && formData.smallBusinessNote && (
                  <p className="mt-4 text-xs text-gray-500">{formData.smallBusinessNote}</p>
                )}
              </div>

              <div className="mt-12 pt-8 border-t border-gray-100 text-sm">
                <p className="mb-4 whitespace-pre-line">{formData.footerText}</p>

                {isInvoice && (
                  <div className="bg-gray-50 p-4 rounded text-xs text-gray-600 grid grid-cols-2 gap-4 print:bg-transparent print:p-0">
                    <div>
                      <strong>Bankverbindung:</strong>
                      <br />
                      {settings.bankName}
                      <br />
                      IBAN: {settings.iban}
                      <br />
                      BIC: {settings.bic}
                    </div>
                    <div className="text-right">
                      <strong>Steuer-Nr:</strong> {settings.taxId}
                      <br />
                      Bitte geben Sie bei der Zahlung die Rechnungsnummer an.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bottom-action-bar sm:hidden no-print safe-area-container">
              <div className="flex flex-wrap gap-2 justify-end">
                <AppButton variant="secondary" onClick={() => void handleDownloadPdf()}>
                  <FileDown size={16} /> PDF herunterladen
                </AppButton>

                <AppButton
                  variant="secondary"
                  onClick={() => setShowSendModal(true)}
                >
                  <Mail size={16} /> E-Mail
                </AppButton>

                <AppButton
                  variant="secondary"
                  aria-label={readOnly ? "Schließen" : undefined}
                  onClick={() => {
                    if (readOnly) onClose();
                    else setShowPrint(false);
                  }}
                >
                  <X size={16} aria-hidden="true" /> {readOnly ? "Schließen" : "Zurück"}
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Normal Editor ----------
  return (
    <div
      className={
        isPageLayout
          ? "min-h-screen-safe bg-gray-50"
          : isEmbeddedLayout
          ? "bg-white flex flex-col min-h-0"
          : "fixed inset-0 bg-gray-900/50 flex items-end sm:items-center justify-center p-4 z-40"
      }
    >
      {sendModal}
      <div
        className={
          isPageLayout
            ? "bg-white min-h-screen-safe flex flex-col"
            : isEmbeddedLayout
            ? "bg-white flex flex-col min-h-0"
            : "bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-4xl h-[100vh] h-[100dvh] sm:h-[90vh] flex flex-col safe-bottom"
        }
      >
        {showOfferWizard ? (
          <>
            {showHeader && (
              <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
                <AppButton variant="ghost" onClick={onClose} aria-label="Zurück">
                  <ArrowLeft size={20} />
                </AppButton>
                <h2 className="text-lg font-semibold text-gray-900">Angebot erstellen</h2>
                <AppButton variant="ghost" aria-label="Einstellungen">
                  <Settings size={20} />
                </AppButton>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="px-6 pt-4 pb-3 border-b bg-white">
                <div className="text-base font-semibold text-gray-700">Kundendaten eingeben</div>
              </div>

              <div className="px-6 py-4 space-y-5">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">Kundendaten</h3>
                  </div>
                  <div className="divide-y">
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <label
                        className="text-sm font-medium text-gray-700"
                        htmlFor="document-client"
                      >
                        Kunde
                      </label>
                      <select
                        id="document-client"
                        className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm"
                        value={formData.clientId}
                        disabled={disabled}
                        onChange={(e) => handleClientChange(e.target.value)}
                      >
                        <option value="">Kunde auswählen</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    {isInvoice && (
                      <div className="px-4 py-3 text-xs text-gray-500">
                        Kundendaten werden in die Rechnung übernommen.
                      </div>
                    )}
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-gray-700">Ansprechpartner</span>
                      <span className="w-full sm:max-w-[260px] text-sm text-gray-700">
                        {displayClient?.contactPerson || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-gray-700">E-Mail</span>
                      <span className="w-full sm:max-w-[260px] text-sm text-gray-700">
                        {displayClient?.email || "—"}
                      </span>
                    </div>
                    {isInvoice && (
                      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                        <span className="text-sm font-medium text-gray-700">Adresse</span>
                        <div className="w-full sm:max-w-[260px] text-sm text-gray-700 whitespace-pre-line">
                          {displayClient?.address || "—"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">Angebotsdetails</h3>
                  </div>
                  <div className="divide-y">
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="text-sm font-medium text-gray-700" htmlFor="document-number">
                        Angebotsnummer
                      </label>
                      <input
                        id="document-number"
                        className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm"
                        value={formData.number ?? ""}
                        disabled={disabled}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="z.B. ANG-2023-001"
                      />
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="text-sm font-medium text-gray-700" htmlFor="document-date">
                        {isInvoice ? "Rechnungsdatum" : "Datum"}
                      </label>
                      <input
                        id="document-date"
                        type="date"
                        className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm"
                        value={formData.date}
                        disabled={isInvoice ? invoiceMetaDisabled : disabled}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <label
                        className="text-sm font-medium text-gray-700"
                        htmlFor="document-valid-until"
                      >
                        Gültig bis
                      </label>
                      <input
                        id="document-valid-until"
                        type="date"
                        className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm"
                        value={formData.validUntil ?? ""}
                        disabled={disabled}
                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="text-sm font-medium text-gray-700" htmlFor="document-vat">
                        MwSt. (%)
                      </label>
                      <input
                        id="document-vat"
                        type="number"
                        className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm"
                        value={formData.vatRate ?? 0}
                        disabled={disabled}
                        onChange={(e) =>
                          setFormData({ ...formData, vatRate: toNumberOrZero(e.target.value) })
                        }
                        inputMode="decimal"
                      />
                    </div>
                    {!isInvoice && (
                      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <label
                          className="text-sm font-medium text-gray-700"
                          htmlFor="document-currency"
                        >
                          Währung
                        </label>
                        <select
                          id="document-currency"
                          className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm"
                          value={formData.currency ?? documentCurrency}
                          disabled={disabled}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        >
                          {currencyOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  {(formData.positions ?? []).length > 0 && (
                    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                      {(formData.positions ?? []).map((pos, idx) => (
                        <div key={pos.id ?? idx} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-center">
                          <input
                            className="w-full border rounded-lg p-2 text-sm"
                            placeholder="Beschreibung"
                            value={pos.description ?? ""}
                            disabled={disabled}
                            onChange={(e) => updatePosition(idx, "description", e.target.value)}
                          />
                          <input
                            type="number"
                            className="w-full border rounded-lg p-2 text-sm"
                            placeholder="Menge"
                            value={pos.quantity ?? 0}
                            disabled={disabled}
                            onChange={(e) =>
                              updatePosition(idx, "quantity", toNumberOrZero(e.target.value))
                            }
                            inputMode="decimal"
                          />
                          <input
                            className="w-full border rounded-lg p-2 text-sm"
                            placeholder="Einh."
                            value={pos.unit ?? ""}
                            disabled={disabled}
                            onChange={(e) => updatePosition(idx, "unit", e.target.value)}
                          />
                          <div className="relative">
                            <input
                              type="number"
                              className="w-full border rounded-lg p-2 pr-12 text-sm"
                              placeholder="Preis/Std"
                              value={pos.price ?? 0}
                              disabled={disabled}
                              onChange={(e) =>
                                updatePosition(idx, "price", toNumberOrZero(e.target.value))
                              }
                              inputMode="decimal"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                              {documentCurrency}
                            </span>
                          </div>
                          {!readOnly && (
                            <button
                              onClick={() => removePosition(idx)}
                              className="h-10 w-10 inline-flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg"
                              title="Position löschen"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!readOnly && (
                    <AppButton
                      variant="primary"
                      onClick={addPosition}
                      className="w-full sm:w-auto px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    >
                      <Plus size={18} /> Position hinzufügen
                    </AppButton>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">Zusammenfassung</h3>
                  </div>
                  <div className="px-4 py-4 space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Zwischensumme:</span>
                      <span>
                        {formatMoney(totals.subtotal, documentCurrency, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>zzgl. MwSt. ({toNumberOrZero(formData.vatRate)}%):</span>
                      <span>
                        {formatMoney(totals.tax, documentCurrency, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-blue-700 pt-2 border-t">
                      <span>Gesamtbetrag:</span>
                      <span>
                        {formatMoney(totals.total, documentCurrency, locale)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="space-y-3">
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        htmlFor="document-intro"
                      >
                        Einleitungstext
                      </label>
                      <textarea
                        id="document-intro"
                        className="w-full border rounded-lg p-2 text-sm"
                        rows={2}
                        value={formData.introText ?? ""}
                        disabled={disabled}
                        onChange={(e) => setFormData({ ...formData, introText: e.target.value })}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        htmlFor="document-footer"
                      >
                        Fußtext
                      </label>
                      <textarea
                        id="document-footer"
                        className="w-full border rounded-lg p-2 text-sm"
                        rows={2}
                        value={formData.footerText ?? ""}
                        disabled={disabled}
                        onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-white flex justify-between gap-3">
              <AppButton
                variant="secondary"
                onClick={onClose}
                className="w-full sm:w-40 justify-center"
              >
                Zurück
              </AppButton>
              <AppButton
                onClick={() => void handleSave({ closeAfterSave: true })}
                disabled={saving || !formData.clientId}
                className="w-full sm:w-40 justify-center bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? "Speichere..." : "Weiter"}
              </AppButton>
            </div>
          </>
        ) : (
          <>
            {showHeader && (
              <div className="flex justify-between items-center p-6 border-b">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">
                    {readOnly
                      ? isInvoice
                        ? "Rechnung ansehen"
                        : "Angebot ansehen"
                      : isInvoice
                      ? "Rechnung bearbeiten"
                      : "Angebot bearbeiten"}
                  </h2>
                  {isInvoice && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded border bg-gray-100 text-gray-700">
                        {formatDocumentStatus(type, formData.status)}
                      </span>
                      {locked && (
                        <span className="px-2 py-1 rounded border bg-red-50 text-red-600 border-red-200">
                          Locked
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <AppButton variant="ghost" onClick={onClose} aria-label="Zurück">
                  {isPageLayout ? <ArrowLeft size={20} /> : <X size={20} />}
                </AppButton>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${actionMode === "save-only" ? "bottom-action-spacer" : ""}`}>
              {showTabs && (
                <div className="flex items-center gap-2 border-b pb-2">
                  <button
                    type="button"
                    className={`text-sm font-medium px-3 py-2 rounded-t ${
                      activeTab === "details"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("details")}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className={`text-sm font-medium px-3 py-2 rounded-t ${
                      activeTab === "activity"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("activity")}
                  >
                    Aktivität
                  </button>
                </div>
              )}

              {showTabs && activeTab === "activity" ? (
                <div className="mt-4">
                  <ActivityTimeline docType={type} docId={formData.id} />
                </div>
              ) : (
              <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="document-client"
                  >
                    Kunde
                  </label>
                  <select
                    id="document-client"
                    className="w-full border rounded p-2"
                    value={formData.clientId}
                    disabled={disabled}
                    onChange={(e) => handleClientChange(e.target.value)}
                  >
                    <option value="">Wählen...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                  {isInvoice && (
                    <p className="mt-2 text-xs text-gray-500">
                      Kundendaten werden in die Rechnung übernommen.
                    </p>
                  )}
                  {isInvoice && (
                    <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
                      <div className="font-semibold">
                        {displayClient?.companyName || displayClient?.contactPerson || "—"}
                      </div>
                      {displayClient?.contactPerson &&
                        displayClient.contactPerson !== displayClient.companyName && (
                          <div>{displayClient.contactPerson}</div>
                        )}
                      {displayClient?.address && (
                        <div className="mt-1 whitespace-pre-line">{displayClient.address}</div>
                      )}
                      <div className="mt-2">
                        <Link to="/app/clients" className="text-xs text-blue-600 hover:underline">
                          Kunde bearbeiten
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="document-number"
                  >
                    Nummer
                  </label>
                  <input
                    id="document-number"
                    className="w-full border rounded p-2"
                    value={formData.number ?? ""}
                    disabled={disabled || isInvoice}
                    readOnly={isInvoice}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder={isInvoice ? "Wird bei Finalisierung vergeben" : undefined}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="document-date"
                  >
                    {isInvoice ? "Rechnungsdatum" : "Datum"}
                  </label>
                  <input
                    id="document-date"
                    type="date"
                    className="w-full border rounded p-2"
                    value={formData.date}
                    disabled={isInvoice ? invoiceMetaDisabled : disabled}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              {isInvoice ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      htmlFor="document-payment-terms"
                    >
                      Zahlungsziel (Tage)
                    </label>
                    <input
                      id="document-payment-terms"
                      type="number"
                      className="w-full border rounded p-2"
                      value={formData.paymentTermsDays ?? 14}
                      disabled={invoiceMetaDisabled}
                      min={0}
                      max={365}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentTermsDays: Math.min(
                            365,
                            Math.max(0, Math.trunc(toNumberOrZero(e.target.value)))
                          ),
                        })
                      }
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      htmlFor="document-due-date"
                    >
                      Fällig am
                    </label>
                    <input
                      id="document-due-date"
                      type="date"
                      className="w-full border rounded p-2"
                      value={formData.dueDate ?? ""}
                      readOnly
                      disabled={disabled}
                    />
                  </div>
                  {!isSmallBusiness && (
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        htmlFor="document-vat"
                      >
                        MwSt (%)
                      </label>
                      <input
                        id="document-vat"
                        type="number"
                        className="w-full border rounded p-2"
                        value={formData.vatRate ?? 0}
                        disabled={disabled}
                        onChange={(e) =>
                          setFormData({ ...formData, vatRate: toNumberOrZero(e.target.value) })
                        }
                        inputMode="decimal"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="flex items-start gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={isSmallBusiness}
                        disabled={disabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            isSmallBusiness: checked,
                            smallBusinessNote: checked
                              ? prev.smallBusinessNote?.trim() ||
                                settings.smallBusinessNote ||
                                ""
                              : prev.smallBusinessNote ?? "",
                          }));
                        }}
                      />
                      <span>
                        <span className="font-medium">Kleinunternehmer (§ 19 UStG)</span>
                        <span className="block text-xs text-gray-500">
                          Keine Umsatzsteuer ausweisen und Hinweistext auf der Rechnung anzeigen.
                        </span>
                      </span>
                    </label>
                  </div>
                  {isSmallBusiness && (
                    <div className="md:col-span-2">
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        htmlFor="document-small-business-note"
                      >
                        Hinweistext
                      </label>
                      <textarea
                        id="document-small-business-note"
                        className="w-full border rounded p-2"
                        rows={2}
                        value={formData.smallBusinessNote ?? ""}
                        disabled={disabled}
                        onChange={(e) =>
                          setFormData({ ...formData, smallBusinessNote: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      htmlFor="document-valid-until"
                    >
                      Gültig bis
                    </label>
                    <input
                      id="document-valid-until"
                      type="date"
                      className="w-full border rounded p-2"
                      value={formData.validUntil ?? ""}
                      disabled={disabled}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      htmlFor="document-vat"
                    >
                      MwSt (%)
                    </label>
                    <input
                      id="document-vat"
                      type="number"
                      className="w-full border rounded p-2"
                      value={formData.vatRate ?? 0}
                      disabled={disabled}
                      onChange={(e) =>
                        setFormData({ ...formData, vatRate: toNumberOrZero(e.target.value) })
                      }
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      htmlFor="document-currency"
                    >
                      Währung
                    </label>
                    <select
                      id="document-currency"
                      className="w-full border rounded p-2"
                      value={formData.currency ?? documentCurrency}
                      disabled={disabled}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      {currencyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}


          {!isInvoice && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Communication
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span
                  className={`px-2 py-1 rounded border ${
                    formData.status === OfferStatus.DRAFT
                      ? "bg-white border-gray-400 text-gray-700"
                      : "bg-gray-100 border-gray-200 text-gray-500"
                  }`}
                >
                  Draft
                </span>
                <span className="text-gray-400">-&gt;</span>
                <span
                  className={`px-2 py-1 rounded border ${
                    formData.status === OfferStatus.SENT ||
                    formData.status === OfferStatus.ACCEPTED ||
                    formData.status === OfferStatus.REJECTED
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-gray-100 border-gray-200 text-gray-500"
                  }`}
                >
                  Sent
                </span>
                <span className="text-gray-400">-&gt;</span>
                <span
                  className={`px-2 py-1 rounded border ${
                    formData.status === OfferStatus.ACCEPTED
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-gray-100 border-gray-200 text-gray-500"
                  }`}
                >
                  Accepted
                </span>
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Next steps / Result
                </div>
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  {formData.status === OfferStatus.REJECTED && (
                    <div className="text-red-600">Offer declined</div>
                  )}
                  {formData.status === OfferStatus.ACCEPTED && (
                    <div className="text-green-700">Offer accepted</div>
                  )}
                  {formData.invoiceId && (
                    <div>
                      Invoice created: <span className="text-gray-500">{formData.invoiceId}</span>
                    </div>
                  )}
                  {formData.sentCount && formData.lastSentAt ? (
                    <div className="text-gray-500">
                      Sent {formData.sentCount}x - zuletzt {formatDate(formData.lastSentAt, locale)}
                    </div>
                  ) : (
                    <div className="text-gray-500">Not sent yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="document-intro"
            >
              Einleitungstext
            </label>
            <textarea
              id="document-intro"
              className="w-full border rounded p-2"
              rows={2}
              value={formData.introText ?? ""}
              disabled={disabled}
              onChange={(e) => setFormData({ ...formData, introText: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800">Positionen</h3>
            </div>

            <div className="space-y-2">
              {(formData.positions ?? []).map((pos, idx) => (
                <div key={pos.id ?? idx} className="flex flex-col sm:flex-row gap-2 sm:items-start">
                  <div className="flex-[3]">
                    <input
                      className="w-full border rounded p-2"
                      placeholder="Beschreibung"
                      value={pos.description ?? ""}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "description", e.target.value)}
                    />
                  </div>

                  <div className="w-full sm:w-20">
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      placeholder="Menge"
                      value={pos.quantity ?? 0}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "quantity", toNumberOrZero(e.target.value))}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="w-full sm:w-20">
                    <input
                      className="w-full border rounded p-2"
                      placeholder="Einh."
                      value={pos.unit ?? ""}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "unit", e.target.value)}
                    />
                  </div>

                  <div className="relative w-full sm:w-28">
                    <input
                      type="number"
                      className="w-full border rounded p-2 pr-12"
                      placeholder="Preis/Std"
                      value={pos.price ?? 0}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "price", toNumberOrZero(e.target.value))}
                      inputMode="decimal"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {documentCurrency}
                    </span>
                  </div>

                  {!readOnly && (
                    <button
                      onClick={() => removePosition(idx)}
                      className="h-11 w-11 inline-flex items-center justify-center text-red-500 hover:bg-red-50 rounded"
                      title="Position löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              {!readOnly && (
                <AppButton
                  variant="secondary"
                  onClick={addPosition}
                  className="w-full justify-center border-dashed mt-2"
                >
                  <Plus size={16} /> Position hinzufügen
                </AppButton>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <div className="w-full sm:w-64 space-y-2 text-right">
              {isSmallBusiness ? (
                <div className="flex justify-between font-bold text-lg">
                  <span>Gesamtbetrag:</span> <span>{formatMoney(totals.total, documentCurrency, locale)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Netto:</span> <span>{formatMoney(totals.subtotal, documentCurrency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>MwSt ({toNumberOrZero(formData.vatRate)}%):</span>{" "}
                    <span>{formatMoney(totals.tax, documentCurrency, locale)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Gesamt:</span> <span>{formatMoney(totals.total, documentCurrency, locale)}</span>
                  </div>
                </>
              )}
              {isSmallBusiness && formData.smallBusinessNote && (
                <p className="pt-2 text-xs text-gray-500 text-left">{formData.smallBusinessNote}</p>
              )}
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              htmlFor="document-footer"
            >
              Fußtext
            </label>
            <textarea
              id="document-footer"
              className="w-full border rounded p-2"
              rows={2}
              value={formData.footerText ?? ""}
              disabled={disabled}
              onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
            />
          </div>
        </div>
              )}
            </div>

        {actionMode === "save-only" ? (
          !readOnly && (
            <div className={isPageLayout ? "bottom-action-bar safe-area-container" : "p-6 border-t bg-gray-50"}>
              <AppButton
                disabled={saving || !formData.clientId}
                onClick={() => void handleSave({ closeAfterSave: true })}
                className="w-full justify-center"
              >
                {saving ? "Speichere..." : primaryActionLabel}
              </AppButton>
            </div>
          )
        ) : (
          <div className="p-6 border-t bg-gray-50 flex justify-between items-center rounded-b-xl">
            <AppButton variant="ghost" onClick={onClose} aria-label="Schließen">
              <X size={16} aria-hidden="true" />
            </AppButton>

            <div className="flex gap-2 flex-wrap justify-end">
              <AppButton
                variant="secondary"
                disabled={saving}
                onClick={async () => {
                  if (readOnly || locked) {
                    setShowPrint(true);
                    return;
                  }
                  const ok = await handleSave({ closeAfterSave: false });
                  if (ok) setShowPrint(true);
                }}
              >
                Vorschau & Drucken
              </AppButton>

              {!readOnly && (
                <AppButton
                  disabled={saving || !formData.clientId}
                  onClick={() => void handleSave({ closeAfterSave: true })}
                >
                  {saving ? "Speichere..." : "Speichern"}
                </AppButton>
              )}

              {showStatusActions && !readOnly && !isInvoice && formData.status === OfferStatus.DRAFT && (
                <AppButton onClick={() => setShowSendModal(true)}>
                  <Mail size={16} /> Send offer
                </AppButton>
              )}

              {showStatusActions && !readOnly && !isInvoice && formData.status !== OfferStatus.DRAFT && (
                <AppButton variant="secondary" onClick={() => setShowSendModal(true)}>
                  <Mail size={16} /> Resend
                </AppButton>
              )}

              {showStatusActions && !readOnly && !isInvoice && (
                <AppButton variant="secondary" onClick={() => void handleMarkOfferSentManual()}>
                  Mark as sent
                </AppButton>
              )}

              {showStatusActions && !readOnly && !isInvoice && (
                <AppButton
                  variant="secondary"
                  onClick={() => void handleMarkOfferAccepted()}
                  disabled={formData.status === OfferStatus.ACCEPTED}
                >
                  Mark as accepted
                </AppButton>
              )}

              {showStatusActions && !readOnly && !isInvoice && (
                <AppButton
                  variant="secondary"
                  onClick={() => void handleMarkOfferDeclined()}
                  disabled={formData.status === OfferStatus.REJECTED}
                >
                  Mark as declined
                </AppButton>
              )}

              {showStatusActions && !readOnly && !isInvoice && (
                <AppButton
                  variant="secondary"
                  onClick={() => void handleCreateInvoiceFromOffer()}
                  disabled={!canConvertToInvoice(formData as any) || Boolean(formData.invoiceId)}
                >
                  Create invoice
                </AppButton>
              )}

              {showStatusActions && isInvoice && !readOnly && formData.status === InvoiceStatus.DRAFT && (
                <>
                  <AppButton variant="secondary" onClick={() => void handleFinalizeInvoice()}>
                    Finalisieren
                  </AppButton>
                  <AppButton onClick={() => setShowSendModal(true)}>
                    Finalisieren & Senden
                  </AppButton>
                </>
              )}

              {showStatusActions && isInvoice && formData.status !== InvoiceStatus.DRAFT && (
                <AppButton onClick={() => setShowSendModal(true)}>
                  <Mail size={16} /> Per E-Mail senden
                </AppButton>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
