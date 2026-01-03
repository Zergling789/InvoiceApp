// src/features/documents/DocumentEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Trash2,
  Plus,
  FileDown,
  Mail,
  ArrowLeft,
  Settings,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";

import type { Client, UserSettings, Position } from "@/types";
import { InvoiceStatus, OfferStatus, formatCurrency, formatDate } from "@/types";

import { AppButton } from "@/ui/AppButton";
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

export type EditorSeed = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  vatRate: number;
  introText: string;
  footerText: string;
};

type FormData = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  clientId: string;
  positions: Position[];
  introText: string;
  footerText: string;
  status: InvoiceStatus | OfferStatus;
  vatRate: number;
  paymentDate?: string;
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

function getInitials(value: string | undefined | null): string {
  if (!value) return "—";
  const parts = value.trim().split(/\s+/);
  const [first, second] = parts;
  if (!first) return "—";
  return `${first[0]}${second?.[0] ?? ""}`.toUpperCase();
}

const formatStatusLabel = (status: InvoiceStatus | OfferStatus) =>
  status ? `${status.slice(0, 1)}${status.slice(1).toLowerCase()}` : "—";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function applyTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => data[key] ?? match);
}

function buildFormData(
  seed: EditorSeed,
  initial: Partial<FormData> | undefined,
  isInvoice: boolean
): FormData {
  const base: FormData = {
    id: seed.id,
    number: seed.number,
    date: seed.date,
    dueDate: seed.dueDate,
    validUntil: seed.validUntil,
    clientId: "",
    positions: [],
    introText: seed.introText ?? "",
    footerText: seed.footerText ?? "",
    status: isInvoice ? InvoiceStatus.DRAFT : OfferStatus.DRAFT,
    vatRate: seed.vatRate ?? 0,
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
    positions: Array.isArray(merged.positions) ? (merged.positions as Position[]) : [],
    introText: merged.introText ?? "",
    footerText: merged.footerText ?? "",
    vatRate: Number(merged.vatRate ?? 0),
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
}) {
  const isInvoice = type === "invoice";

  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [showPrint, setShowPrint] = useState(startInPrint);
  const [showSendModal, setShowSendModal] = useState(false);

  const [formData, setFormData] = useState<FormData>(() =>
    buildFormData(seed, initial, isInvoice)
  );
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");

  // ✅ WICHTIG: wenn seed/initial wechseln (Viewer lädt async), state neu setzen
  useEffect(() => {
    setFormData(buildFormData(seed, initial, isInvoice));
    setActiveTab("details");
    setShowPrint(startInPrint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.id, startInPrint]);

  useEffect(() => {
    // initial kann nachträglich gesetzt werden (async)
    if (initial) {
      setFormData((prev) => buildFormData({ ...seed }, { ...prev, ...initial }, isInvoice));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const locked = Boolean(formData.isLocked);
  const disabled = readOnly || locked || saving;
  const showOfferWizard =
    !isInvoice && !readOnly && formData.status === OfferStatus.DRAFT && !formData.invoiceId;
  const selectedClient = clients.find((c) => c.id === formData.clientId);
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
    const tax = calcVat(subtotal, toNumberOrZero(formData.vatRate));
    return { subtotal, tax, total: calcGross(subtotal, tax) };
  }, [formData.positions, formData.vatRate]);

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
    if (isInvoice && !data.dueDate) {
      toast.error("Bitte Fälligkeitsdatum setzen");
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
          projectId: data.projectId,
          date: data.date,
          dueDate: data.dueDate!,
          positions: data.positions ?? [],
          vatRate: toNumberOrZero(data.vatRate),
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

      if (closeAfterSave) onClose();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadDocumentPdf({
        type: isInvoice ? "invoice" : "offer",
        docId: formData.id,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "PDF konnte nicht erstellt werden.";
      toast.error(message);
    }
  };

  function buildTemplateDefaults(data: FormData) {
    const client = clients.find((c) => c.id === data.clientId);
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

  const handleSendSuccess = async (nextData: FormData) => {
    setFormData(nextData);
    await handleSave({ closeAfterSave: false, data: nextData, allowLocked: true });
    await onSaved();
  };

  const validateFinalizeInvoice = () => {
    if (!formData.clientId) {
      toast.error("Bitte Kunde wählen");
      return false;
    }
    if (!formData.number?.trim()) {
      toast.error("Bitte Rechnungsnummer vergeben");
      return false;
    }
    if (!formData.date) {
      toast.error("Bitte Rechnungsdatum setzen");
      return false;
    }
    if (!formData.dueDate) {
      toast.error("Bitte Fälligkeitsdatum setzen");
      return false;
    }
    if (!selectedClient?.address?.trim()) {
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
      toast.error("Bitte einen gültigen MwSt.-Satz setzen");
      return false;
    }
    if (!Number.isFinite(settings.defaultPaymentTerms) || settings.defaultPaymentTerms <= 0) {
      toast.error("Bitte Zahlungsziel in den Einstellungen prüfen");
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

    const { error } = await supabase.rpc("finalize_invoice", {
      invoice_id: formData.id,
    });

    if (error) {
      toast.error(
        mapErrorCodeToToast(error.code ?? error.message) ||
          "Rechnung konnte nicht finalisiert werden."
      );
      return null;
    }

    const updated = await invoiceService.getInvoice(formData.id);
    if (!updated) {
      toast.error("Rechnung konnte nicht geladen werden.");
      return null;
    }

    const nextData: FormData = {
      ...formData,
      ...updated,
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
    navigate("/app/invoices", { state: { openId: invoiceId } });
  };

  const sendModal = (
    <SendDocumentModal
      isOpen={showSendModal}
      onClose={() => setShowSendModal(false)}
      documentType={isInvoice ? "invoice" : "offer"}
      document={formData as any}
      client={selectedClient}
      settings={settings}
      defaultSubject={defaultSubject}
      defaultMessage={defaultMessage}
      onFinalize={isInvoice ? handleFinalizeInvoice : undefined}
      onSent={async (nextData) => {
        await handleSendSuccess(nextData as FormData);
      }}
    />
  );

  // ---------- Print Overlay ----------
  if (showPrint) {
    const client = clients.find((c) => c.id === formData.clientId);

    return (
      <div className="fixed inset-0 bg-white z-50 overflow-hidden">
        {sendModal}
        <div className="flex h-full min-h-[100vh] min-h-[100dvh] flex-col">
          <div className="flex-1 overflow-y-auto safe-top safe-area-container bottom-action-spacer bg-slate-100 print:bg-white">
            <div className="w-full max-w-none px-4 pt-6 pb-24 sm:max-w-[210mm] sm:mx-auto sm:p-[10mm] sm:pb-[10mm]">
              <div className="no-print flex flex-col gap-3 mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-200 sm:flex-row sm:items-center sm:justify-between">
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

              <div className="space-y-5">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 print:shadow-none print:border-transparent">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="text-xl font-semibold text-slate-900">{settings.companyName}</h1>
                      <p className="text-sm text-slate-500 whitespace-pre-line">{settings.address}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <h2 className="text-2xl font-semibold text-slate-900 mb-1">
                        {isInvoice ? "RECHNUNG" : "ANGEBOT"}
                      </h2>
                      <p className="text-sm text-slate-500">Nr: {formData.number}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[1.2fr_1fr] sm:items-start">
                    <div className="rounded-2xl bg-blue-50 p-4 text-blue-700 space-y-3">
                      <div className="flex items-start gap-3">
                        <CalendarDays size={18} className="mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Datum</p>
                          <p className="font-semibold">
                            {formatDate(formData.date, settings.locale ?? "de-DE")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <BadgeCheck size={18} className="mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            {isInvoice ? "Fällig" : "Gültig bis"}
                          </p>
                          <p className="font-semibold">
                            {isInvoice
                              ? formData.dueDate
                                ? formatDate(formData.dueDate, settings.locale ?? "de-DE")
                                : "—"
                              : formData.validUntil
                                ? formatDate(formData.validUntil, settings.locale ?? "de-DE")
                                : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 sm:text-right">
                      <div>
                        <span className="text-slate-400">Datum:</span>{" "}
                        <span className="font-semibold text-slate-700">
                          {formatDate(formData.date, settings.locale ?? "de-DE")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">{isInvoice ? "Fällig:" : "Gültig bis:"}</span>{" "}
                        <span className="font-semibold text-slate-700">
                          {isInvoice
                            ? formData.dueDate
                              ? formatDate(formData.dueDate, settings.locale ?? "de-DE")
                              : "—"
                            : formData.validUntil
                              ? formatDate(formData.validUntil, settings.locale ?? "de-DE")
                              : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Zwischensumme:</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(totals.subtotal, settings.locale ?? "de-DE", settings.currency ?? "EUR")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                    {getInitials(client?.contactPerson ?? client?.companyName)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {client?.contactPerson ?? client?.companyName ?? "—"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {(client?.address ?? "").split("\n")[0] || "—"}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 print:shadow-none print:border-transparent">
                  <h3 className="font-semibold text-slate-800 mb-3 text-base">
                    {isInvoice ? `Rechnung ${formData.number}` : `Angebot ${formData.number}`}
                  </h3>

                  {formData.introText && (
                    <p className="mb-4 whitespace-pre-line text-sm text-slate-500">
                      {formData.introText}
                    </p>
                  )}

                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500">
                          <th className="py-2 w-1/2">Beschreibung</th>
                          <th className="py-2 text-right">Menge</th>
                          <th className="py-2 text-right">Einzelpreis</th>
                          <th className="py-2 text-right">Gesamt</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(formData.positions ?? []).map((pos, idx) => (
                          <tr key={pos.id ?? idx} className="border-b border-slate-100">
                            <td className="py-3 pr-4">{pos.description}</td>
                            <td className="py-3 text-right">
                              {toNumberOrZero(pos.quantity)} {pos.unit}
                            </td>
                            <td className="py-3 text-right">
                              {formatCurrency(
                                toNumberOrZero(pos.price),
                                settings.locale ?? "de-DE",
                                settings.currency ?? "EUR"
                              )}
                            </td>
                            <td className="py-3 text-right font-medium">
                              {formatCurrency(
                                toNumberOrZero(pos.quantity) * toNumberOrZero(pos.price),
                                settings.locale ?? "de-DE",
                                settings.currency ?? "EUR"
                              )}
                            </td>
                          </tr>
                        ))}
                        {(formData.positions ?? []).length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              Keine Positionen
                            </td>
                          </tr>
                        )}
                      </tbody>

                      <tfoot className="border-t border-slate-200">
                        <tr>
                          <td colSpan={3} className="pt-4 text-right text-slate-500">
                            Zwischensumme:
                          </td>
                          <td className="pt-4 text-right font-semibold">
                            {formatCurrency(totals.subtotal, settings.locale ?? "de-DE", settings.currency ?? "EUR")}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="text-right text-slate-400">
                            Umsatzsteuer ({toNumberOrZero(formData.vatRate)}%):
                          </td>
                          <td className="text-right text-slate-400">
                            {formatCurrency(totals.tax, settings.locale ?? "de-DE", settings.currency ?? "EUR")}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="pt-2 text-right font-semibold text-base">
                            Gesamtsumme:
                          </td>
                          <td className="pt-2 text-right font-semibold text-base">
                            {formatCurrency(totals.total, settings.locale ?? "de-DE", settings.currency ?? "EUR")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-4 text-sm">
                    <p className="mb-4 whitespace-pre-line text-slate-500">{formData.footerText}</p>

                    {isInvoice && (
                      <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-600 grid grid-cols-2 gap-4 print:bg-transparent print:p-0">
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
    <div className="fixed inset-0 bg-gray-900/50 flex items-end sm:items-center justify-center p-4 z-40">
      {sendModal}
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-4xl h-[100vh] h-[100dvh] sm:h-[90vh] flex flex-col safe-bottom">
        {showOfferWizard ? (
          <>
            <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
              <AppButton variant="ghost" onClick={onClose} aria-label="Zurück">
                <ArrowLeft size={20} />
              </AppButton>
              <h2 className="text-lg font-semibold text-gray-900">Angebot erstellen</h2>
              <AppButton variant="ghost" aria-label="Einstellungen">
                <Settings size={20} />
              </AppButton>
            </div>

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
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      >
                        <option value="">Kunde auswählen</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-gray-700">Ansprechpartner</span>
                      <input
                        className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm text-gray-700 bg-gray-50"
                        placeholder="z.B. Max Mustermann"
                        value={selectedClient?.contactPerson ?? ""}
                        readOnly
                      />
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-gray-700">E-Mail</span>
                      <input
                        className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm text-gray-700 bg-gray-50"
                        placeholder="E-Mail-Adresse"
                        value={selectedClient?.email ?? ""}
                        readOnly
                      />
                    </div>
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
                        value={formData.number}
                        disabled={disabled}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="z.B. ANG-2023-001"
                      />
                    </div>
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="text-sm font-medium text-gray-700" htmlFor="document-date">
                        Datum
                      </label>
                      <input
                        id="document-date"
                        type="date"
                        className="w-full sm:max-w-[260px] border rounded-lg p-2 text-sm"
                        value={formData.date}
                        disabled={disabled}
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
                          <input
                            type="number"
                            className="w-full border rounded-lg p-2 text-sm"
                            placeholder="Preis"
                            value={pos.price ?? 0}
                            disabled={disabled}
                            onChange={(e) => updatePosition(idx, "price", toNumberOrZero(e.target.value))}
                            inputMode="decimal"
                          />
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
                        {formatCurrency(
                          totals.subtotal,
                          settings.locale ?? "de-DE",
                          settings.currency ?? "EUR"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>zzgl. MwSt. ({toNumberOrZero(formData.vatRate)}%):</span>
                      <span>
                        {formatCurrency(
                          totals.tax,
                          settings.locale ?? "de-DE",
                          settings.currency ?? "EUR"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-blue-700 pt-2 border-t">
                      <span>Gesamtbetrag:</span>
                      <span>
                        {formatCurrency(
                          totals.total,
                          settings.locale ?? "de-DE",
                          settings.currency ?? "EUR"
                        )}
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
                      {formatStatusLabel(formData.status)}
                    </span>
                    {locked && (
                      <span className="px-2 py-1 rounded border bg-red-50 text-red-600 border-red-200">
                        Locked
                      </span>
                    )}
                  </div>
                )}
              </div>
              <AppButton variant="ghost" onClick={onClose}>
                <X size={20} />
              </AppButton>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

              {activeTab === "activity" ? (
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
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  >
                    <option value="">Wählen...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
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
                    value={formData.number}
                    disabled={disabled}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="document-date"
                  >
                    Datum
                  </label>
                  <input
                    id="document-date"
                    type="date"
                    className="w-full border rounded p-2"
                    value={formData.date}
                    disabled={disabled}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              {isInvoice ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      disabled={disabled}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
                      Sent {formData.sentCount}x - zuletzt {formatDate(formData.lastSentAt, settings.locale ?? "de-DE")}
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

                  <div className="w-full sm:w-24">
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      placeholder="Preis"
                      value={pos.price ?? 0}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "price", toNumberOrZero(e.target.value))}
                      inputMode="decimal"
                    />
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
              <div className="flex justify-between">
                <span>Netto:</span> <span>{formatCurrency(totals.subtotal, settings.locale ?? "de-DE", settings.currency ?? "EUR")}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>MwSt ({toNumberOrZero(formData.vatRate)}%):</span>{" "}
                <span>{formatCurrency(totals.tax, settings.locale ?? "de-DE", settings.currency ?? "EUR")}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Gesamt:</span> <span>{formatCurrency(totals.total, settings.locale ?? "de-DE", settings.currency ?? "EUR")}</span>
              </div>
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

            {!readOnly && !isInvoice && formData.status === OfferStatus.DRAFT && (
              <AppButton onClick={() => setShowSendModal(true)}>
                <Mail size={16} /> Send offer
              </AppButton>
            )}

            {!readOnly && !isInvoice && formData.status !== OfferStatus.DRAFT && (
              <AppButton variant="secondary" onClick={() => setShowSendModal(true)}>
                <Mail size={16} /> Resend
              </AppButton>
            )}

            {!readOnly && !isInvoice && (
              <AppButton variant="secondary" onClick={() => void handleMarkOfferSentManual()}>
                Mark as sent
              </AppButton>
            )}

            {!readOnly && !isInvoice && (
              <AppButton
                variant="secondary"
                onClick={() => void handleMarkOfferAccepted()}
                disabled={formData.status === OfferStatus.ACCEPTED}
              >
                Mark as accepted
              </AppButton>
            )}

            {!readOnly && !isInvoice && (
              <AppButton
                variant="secondary"
                onClick={() => void handleMarkOfferDeclined()}
                disabled={formData.status === OfferStatus.REJECTED}
              >
                Mark as declined
              </AppButton>
            )}

            {!readOnly && !isInvoice && (
              <AppButton
                variant="secondary"
                onClick={() => void handleCreateInvoiceFromOffer()}
                disabled={!canConvertToInvoice(formData as any) || Boolean(formData.invoiceId)}
              >
                Create invoice
              </AppButton>
            )}

            {isInvoice && !readOnly && formData.status === InvoiceStatus.DRAFT && (
              <>
                <AppButton variant="secondary" onClick={() => void handleFinalizeInvoice()}>
                  Finalisieren
                </AppButton>
                <AppButton onClick={() => setShowSendModal(true)}>
                  Finalisieren & Senden
                </AppButton>
              </>
            )}

            {isInvoice && formData.status !== InvoiceStatus.DRAFT && (
              <AppButton onClick={() => setShowSendModal(true)}>
                <Mail size={16} /> Per E-Mail senden
              </AppButton>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
