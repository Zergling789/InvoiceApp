import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, ExternalLink, FileDown, Loader2, Mail, RefreshCw, X } from "lucide-react";

import type { Client, Invoice, Offer, UserSettings } from "@/types";
import { InvoiceStatus } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { useToast } from "@/ui/FeedbackProvider";
import { fetchDocumentPdf } from "@/app/pdf/documentPdfService";
import { sendDocumentEmail } from "@/app/email/emailService";
import { getSendWarnings } from "@/domain/rules/sendWarnings";
import { formatErrorToast } from "@/utils/errorMapping";
import * as invoiceService from "@/app/invoices/invoiceService";

type SendDocumentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  documentType: "offer" | "invoice";
  document: Offer | Invoice;
  client: Client | undefined;
  settings: UserSettings;
  defaultSubject: string;
  defaultMessage: string;
  templateType?: "reminder" | "dunning" | "followup";
  onFinalize?: () => Promise<Offer | Invoice | null>;
  onSent: (nextData: Offer | Invoice) => Promise<void>;
};

type SendFailure = {
  message: string;
  statusUnknown: boolean;
};

type PreviewState = "idle" | "loading" | "ready" | "failed";

const AMBIGUOUS_EMAIL_CODES = new Set([
  "EMAIL_SEND_STATUS_UNKNOWN",
  "EMAIL_SENT_STATUS_UPDATE_FAILED",
]);

export const isEmailDeliveryStatusUnknown = (code?: string | null) =>
  Boolean(code && AMBIGUOUS_EMAIL_CODES.has(code));

export const supportsEmbeddedPdfPreview = (userAgent: string) => {
  const isAppleMobile = /iPad|iPhone|iPod/i.test(userAgent);
  const isIpadDesktopMode = /Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent);
  return !isAppleMobile && !isIpadDesktopMode;
};

const parseEmails = (value: string) =>
  value
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const getSendDialogCopy = (
  documentType: "offer" | "invoice",
  templateType?: SendDocumentModalProps["templateType"],
) => {
  if (templateType === "reminder" && documentType === "invoice") {
    return { title: "Zahlungserinnerung senden", action: "Erinnerung senden", success: "Zahlungserinnerung wurde versendet." };
  }
  if (templateType === "dunning" && documentType === "invoice") {
    return { title: "Mahnung senden", action: "Mahnung senden", success: "Mahnung wurde versendet." };
  }
  if (templateType === "followup" && documentType === "offer") {
    return { title: "Angebot nachfassen", action: "Nachfrage senden", success: "Nachfrage wurde versendet." };
  }
  const documentLabel = documentType === "invoice" ? "Rechnung" : "Angebot";
  return { title: `${documentLabel} senden`, action: "Senden", success: `${documentLabel} wurde versendet.` };
};

export const getSendEmailErrors = ({
  to,
  cc,
  bcc,
  subject,
  senderIdentityId,
  documentType,
  documentStatus,
  allowDraftInvoice = false,
}: {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  senderIdentityId?: string | null;
  documentType: "offer" | "invoice";
  documentStatus: string;
  allowDraftInvoice?: boolean;
}) => {
  const errors: string[] = [];
  if (!to.trim()) errors.push("Empfänger fehlt.");
  if (to.trim() && parseEmails(to).some((entry) => !isValidEmail(entry))) errors.push("Empfängeradresse ist ungültig.");
  if (cc.trim() && parseEmails(cc).some((entry) => !isValidEmail(entry))) errors.push("CC enthält ungültige Adressen.");
  if (bcc.trim() && parseEmails(bcc).some((entry) => !isValidEmail(entry))) errors.push("BCC enthält ungültige Adressen.");
  if (!subject.trim()) errors.push("Betreff fehlt.");
  if (!senderIdentityId) errors.push("Bitte eine verifizierte Absenderadresse hinterlegen.");
  if (!allowDraftInvoice && documentType === "invoice" && documentStatus === InvoiceStatus.DRAFT) {
    errors.push("Rechnung muss vor dem Versand finalisiert werden.");
  }
  return errors;
};

const buildTemplate = ({
  templateType,
  documentType,
  documentNumber,
  client,
}: {
  templateType: SendDocumentModalProps["templateType"];
  documentType: "offer" | "invoice";
  documentNumber: string;
  client?: Client;
}) => {
  const name = client?.contactPerson || client?.companyName || "Hallo";
  if (templateType === "reminder" && documentType === "invoice") {
    return {
      subject: `Rechnung ${documentNumber} – Zahlungserinnerung`,
      message: `Hallo ${name},\n\nwir möchten freundlich an die offene Rechnung ${documentNumber} erinnern. Bitte begleichen Sie den Betrag, sobald es passt.\n\nVielen Dank und beste Grüße`,
    };
  }
  if (templateType === "dunning" && documentType === "invoice") {
    return {
      subject: `Rechnung ${documentNumber} – Mahnung`,
      message: `Hallo ${name},\n\nleider ist unsere Rechnung ${documentNumber} bereits überfällig. Bitte begleichen Sie den offenen Betrag zeitnah.\n\nVielen Dank für Ihre Rückmeldung.`,
    };
  }
  if (templateType === "followup" && documentType === "offer") {
    return {
      subject: `Angebot ${documentNumber} – kurze Rückfrage`,
      message: `Hallo ${name},\n\nkurze Nachfrage zu unserem Angebot ${documentNumber}. Gibt es Rückfragen oder können wir Sie dabei unterstützen?\n\nViele Grüße`,
    };
  }
  return null;
};

export function SendDocumentModal({
  isOpen,
  onClose,
  documentType,
  document,
  client,
  settings,
  defaultSubject,
  defaultMessage,
  templateType,
  onFinalize,
  onSent,
}: SendDocumentModalProps) {
  const titleId = useId();
  const toast = useToast();
  const [localDocument, setLocalDocument] = useState<Offer | Invoice>(document);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sendFailure, setSendFailure] = useState<SendFailure | null>(null);

  const canEmbedPreview = useMemo(
    () => typeof navigator === "undefined" || supportsEmbeddedPdfPreview(navigator.userAgent),
    [],
  );

  const releasePreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const loadPreview = useCallback(async () => {
    setPreviewState("loading");
    setPreviewError(null);
    try {
      const { blob } = await fetchDocumentPdf({ type: documentType, docId: localDocument.id });
      if (!blob || blob.size === 0) throw new Error("Die erzeugte PDF-Datei ist leer.");
      if (blob.type && blob.type !== "application/pdf") throw new Error("Der Server hat keine gültige PDF-Datei geliefert.");
      const url = URL.createObjectURL(blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" }));
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setPreviewState("ready");
    } catch (error) {
      const messageText = error instanceof Error && error.message ? error.message : "PDF konnte nicht geladen werden.";
      releasePreview();
      setPreviewError(messageText);
      setPreviewState("failed");
    }
  }, [documentType, localDocument.id, releasePreview]);

  useEffect(() => {
    if (!isOpen) return;
    setLocalDocument(document);
    setTo(client?.email ?? "");
    setCc("");
    setBcc("");
    const template = buildTemplate({ templateType, documentType, documentNumber: String(document.number ?? ""), client });
    setSubject(template?.subject ?? defaultSubject);
    setMessage(template?.message ?? defaultMessage);
    setSendFailure(null);
    setPreviewError(null);
    setPreviewState("idle");
    releasePreview();
  }, [client, defaultMessage, defaultSubject, document, documentType, isOpen, releasePreview, templateType]);

  useEffect(() => {
    if (!isOpen) return;
    void loadPreview();
  }, [isOpen, loadPreview]);

  useEffect(() => {
    if (!isOpen || !client?.id) return;
    invoiceService.listInvoices().then(setInvoices).catch(() => setInvoices([]));
  }, [isOpen, client?.id]);

  useEffect(() => () => releasePreview(), [releasePreview]);

  const warnings = useMemo(
    () => getSendWarnings({ documentType, document: localDocument, client, settings, invoices }),
    [client, documentType, invoices, localDocument, settings],
  );

  const buildEmailErrors = (activeDocument: Offer | Invoice, allowDraftInvoice = false) =>
    getSendEmailErrors({
      to,
      cc,
      bcc,
      subject,
      senderIdentityId: settings.defaultSenderIdentityId,
      documentType,
      documentStatus: activeDocument.status,
      allowDraftInvoice,
    });

  const emailErrors = useMemo(
    () => buildEmailErrors(localDocument),
    [bcc, cc, documentType, localDocument, settings.defaultSenderIdentityId, subject, to],
  );
  const preFinalizeEmailErrors = useMemo(
    () => buildEmailErrors(localDocument, true),
    [bcc, cc, documentType, localDocument, settings.defaultSenderIdentityId, subject, to],
  );
  const dialogCopy = getSendDialogCopy(documentType, templateType);

  const handleSend = async (docOverride?: Offer | Invoice) => {
    if (sending || sendFailure?.statusUnknown) return;
    const activeDocument = docOverride ?? localDocument;
    if (buildEmailErrors(activeDocument).length > 0) return;
    setSendFailure(null);
    setSending(true);
    try {
      const toList = parseEmails(to);
      const ccList = parseEmails(cc);
      const bccList = parseEmails(bcc);
      const result = await sendDocumentEmail({
        documentId: activeDocument.id,
        documentType,
        to: toList.join(", "),
        cc: ccList.length ? ccList.join(", ") : undefined,
        bcc: bccList.length ? bccList.join(", ") : undefined,
        subject: subject.trim(),
        message: message.trim(),
        senderIdentityId: settings.defaultSenderIdentityId ?? "",
      });
      if (!result.ok) {
        const failureMessage = formatErrorToast({ code: result.code, message: result.message, fallback: "E-Mail konnte nicht gesendet werden." });
        setSendFailure({ message: failureMessage, statusUnknown: isEmailDeliveryStatusUnknown(result.code) });
        toast.error(failureMessage);
        return;
      }
      const nowIso = new Date().toISOString();
      const nextData = {
        ...activeDocument,
        status: documentType === "invoice" && activeDocument.status === InvoiceStatus.ISSUED ? InvoiceStatus.SENT : activeDocument.status,
        sentAt: activeDocument.sentAt ?? nowIso,
        lastSentAt: nowIso,
        lastSentTo: toList.join(", "),
        sentCount: (activeDocument.sentCount ?? 0) + 1,
        sentVia: "EMAIL",
      } as Offer | Invoice;
      await onSent(nextData);
      toast.success(dialogCopy.success);
      onClose();
    } catch (error) {
      const errAny = error as { code?: string; message?: string; requestId?: string } | null;
      const failureMessage = formatErrorToast({
        code: errAny?.code,
        message: errAny?.message,
        requestId: errAny?.requestId,
        fallback: "E-Mail konnte nicht gesendet werden.",
      });
      setSendFailure({ message: failureMessage, statusUnknown: isEmailDeliveryStatusUnknown(errAny?.code) });
      toast.error(failureMessage);
    } finally {
      setSending(false);
    }
  };

  const handleFinalizeAndSend = async () => {
    if (sending || finalizing || sendFailure?.statusUnknown || preFinalizeEmailErrors.length > 0 || !onFinalize) return;
    setFinalizing(true);
    try {
      const next = await onFinalize();
      if (next) {
        setLocalDocument(next);
        setFinalizing(false);
        await handleSend(next);
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleFinalizeOnly = async () => {
    if (!onFinalize || finalizing || sending) return;
    setFinalizing(true);
    try {
      const next = await onFinalize();
      if (next) setLocalDocument(next);
    } finally {
      setFinalizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="app-visual-viewport fixed inset-x-0 z-[70] flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl safe-bottom sm:max-h-[90%] sm:rounded-xl" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">{dialogCopy.title}</h3>
            <p className="text-sm text-gray-500">{documentType === "invoice" ? "Rechnung" : "Angebot"} {documentType === "invoice" ? localDocument.number ?? "Entwurf" : localDocument.number}</p>
          </div>
          <AppButton variant="ghost" onClick={onClose} aria-label="Schließen"><X size={18} /></AppButton>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain scroll-pb-32 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700">PDF-Vorschau</div>
                  <div className="text-xs text-gray-500">
                    {previewState === "loading" ? "PDF wird erstellt …" : previewState === "ready" ? "PDF ist bereit." : "Die Vorschau wird automatisch geladen."}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {previewUrl && (
                    <a className="inline-flex items-center gap-1 text-sm font-medium text-[var(--app-primary)] underline" href={previewUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} /> Vorschau öffnen
                    </a>
                  )}
                  <AppButton variant="secondary" onClick={() => void loadPreview()} disabled={previewState === "loading"}>
                    {previewState === "loading" ? <Loader2 size={16} className="animate-spin" /> : previewState === "failed" ? <RefreshCw size={16} /> : <FileDown size={16} />}
                    {previewState === "loading" ? "Wird geladen …" : previewState === "failed" ? "Erneut versuchen" : "Neu laden"}
                  </AppButton>
                </div>
              </div>

              {previewState === "loading" && (
                <div role="status" className="grid h-[360px] place-items-center rounded border bg-gray-50 px-6 text-center text-sm text-gray-600">
                  <div><Loader2 className="mx-auto mb-3 animate-spin" size={28} /><div className="font-medium">PDF-Vorschau wird vorbereitet</div><div className="mt-1 text-xs text-gray-500">Das kann einige Sekunden dauern.</div></div>
                </div>
              )}

              {previewState === "failed" && (
                <div role="alert" className="grid min-h-56 place-items-center rounded border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
                  <div><AlertCircle className="mx-auto mb-3" size={28} /><div className="font-semibold">PDF-Vorschau konnte nicht geladen werden</div><p className="mt-2 max-w-md">{previewError}</p><AppButton className="mt-4" variant="secondary" onClick={() => void loadPreview()}><RefreshCw size={16} /> Erneut versuchen</AppButton></div>
                </div>
              )}

              {previewState === "ready" && previewUrl && canEmbedPreview && (
                <object data={previewUrl} type="application/pdf" aria-label="PDF-Vorschau" className="h-[360px] w-full rounded border bg-white">
                  <div className="grid h-full place-items-center px-6 text-center text-sm text-gray-600">Die eingebettete Vorschau wird von diesem Browser nicht unterstützt. Öffne die PDF über „Vorschau öffnen“.</div>
                </object>
              )}

              {previewState === "ready" && previewUrl && !canEmbedPreview && (
                <div className="grid min-h-56 place-items-center rounded border bg-gray-50 px-6 py-8 text-center text-sm text-gray-700">
                  <div><FileDown className="mx-auto mb-3" size={30} /><div className="font-semibold">PDF ist bereit</div><p className="mt-2 max-w-md text-gray-500">Auf iPhone und iPad wird die PDF zuverlässig in einer eigenen Ansicht geöffnet, weil Safari eingebettete PDF-Dateien häufig nur als weiße Fläche darstellt.</p><a className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--app-primary)] px-4 py-2 font-semibold text-white" href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> PDF-Vorschau öffnen</a></div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div><label className="mb-1 block text-sm font-medium text-gray-700">Empfänger</label><input className="w-full rounded border p-2" placeholder="to@example.com" value={to} onChange={(event) => setTo(event.target.value)} /></div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-gray-700">CC</label><input className="w-full rounded border p-2" placeholder="cc@example.com" value={cc} onChange={(event) => setCc(event.target.value)} /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700">BCC</label><input className="w-full rounded border p-2" placeholder="bcc@example.com" value={bcc} onChange={(event) => setBcc(event.target.value)} /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700">Betreff</label><input className="w-full rounded border p-2" value={subject} onChange={(event) => setSubject(event.target.value)} /></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700">Nachricht</label><textarea className="w-full rounded border p-2" rows={6} value={message} onChange={(event) => setMessage(event.target.value)} /></div>
            </div>
          </div>

          {warnings.length > 0 && <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><div className="mb-1 font-semibold">Hinweise</div><ul className="list-disc space-y-1 pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
          {emailErrors.length > 0 && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="mb-1 font-semibold">Fehler</div><ul className="list-disc space-y-1 pl-5">{emailErrors.map((entry) => <li key={entry}>{entry}</li>)}</ul></div>}
          {sendFailure && <div role="alert" aria-live="assertive" className={`rounded border px-4 py-3 text-sm ${sendFailure.statusUnknown ? "border-amber-300 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-700"}`}><div className="mb-1 font-semibold">{sendFailure.statusUnknown ? "Versandstatus prüfen" : "Versand fehlgeschlagen"}</div><p>{sendFailure.message}</p></div>}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-gray-50 px-4 py-3 safe-bottom sm:flex-row sm:flex-wrap sm:justify-end sm:px-6 sm:py-4">
          <AppButton className="w-full sm:w-auto" variant="secondary" onClick={onClose}>Abbrechen</AppButton>
          {documentType === "invoice" && localDocument.status === InvoiceStatus.DRAFT && onFinalize && <>
            <AppButton className="w-full sm:w-auto" variant="secondary" onClick={() => void handleFinalizeOnly()} disabled={finalizing || sending || sendFailure?.statusUnknown}>{finalizing ? "Finalisiere ..." : "Nur finalisieren"}</AppButton>
            <AppButton className="w-full sm:w-auto" onClick={() => void handleFinalizeAndSend()} disabled={sending || finalizing || sendFailure?.statusUnknown || preFinalizeEmailErrors.length > 0}>{finalizing ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Finalisieren & senden</AppButton>
          </>}
          {!(documentType === "invoice" && localDocument.status === InvoiceStatus.DRAFT) && <AppButton className="w-full sm:w-auto" onClick={() => void handleSend()} disabled={sending || finalizing || sendFailure?.statusUnknown || emailErrors.length > 0}>{sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} {sending ? "Wird gesendet ..." : dialogCopy.action}</AppButton>}
        </div>
      </div>
    </div>
  );
}
