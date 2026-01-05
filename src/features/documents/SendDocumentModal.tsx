import { useEffect, useMemo, useState } from "react";
import { FileDown, Mail, X } from "lucide-react";

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

const parseEmails = (value: string) =>
  value
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
  const toast = useToast();
  const [localDocument, setLocalDocument] = useState<Offer | Invoice>(document);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setLocalDocument(document);
    setTo(client?.email ?? "");
    setCc("");
    setBcc("");
    const template = buildTemplate({
      templateType,
      documentType,
      documentNumber: String(document.number ?? ""),
      client,
    });
    setSubject(template?.subject ?? defaultSubject);
    setMessage(template?.message ?? defaultMessage);
  }, [client, defaultMessage, defaultSubject, document, documentType, isOpen, templateType]);

  useEffect(() => {
    if (!isOpen || !client?.id) return;
    invoiceService
      .listInvoices()
      .then((data) => setInvoices(data))
      .catch(() => setInvoices([]));
  }, [isOpen, client?.id]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const warnings = useMemo(
    () =>
      getSendWarnings({
        documentType,
        document: localDocument,
        client,
        settings,
        invoices,
      }),
    [client, document, documentType, invoices, settings]
  );

  const emailList = (value: string) => parseEmails(value);
  const emailErrors = useMemo(() => {
    const errors: string[] = [];
    if (!to.trim()) {
      errors.push("Empfänger fehlt.");
    }
    if (to.trim() && emailList(to).some((entry) => !isValidEmail(entry))) {
      errors.push("Empfängeradresse ist ungültig.");
    }
    if (cc.trim() && emailList(cc).some((entry) => !isValidEmail(entry))) {
      errors.push("CC enthält ungültige Adressen.");
    }
    if (bcc.trim() && emailList(bcc).some((entry) => !isValidEmail(entry))) {
      errors.push("BCC enthält ungültige Adressen.");
    }
    if (!subject.trim()) {
      errors.push("Betreff fehlt.");
    }
    if (!settings.defaultSenderIdentityId) {
      errors.push("Bitte eine verifizierte Absenderadresse hinterlegen.");
    }
    if (documentType === "invoice" && localDocument.status === InvoiceStatus.DRAFT) {
      errors.push("Rechnung muss vor dem Versand finalisiert werden.");
    }
    return errors;
  }, [bcc, cc, documentType, localDocument.status, settings.defaultSenderIdentityId, subject, to]);

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const { blob } = await fetchDocumentPdf({
        type: documentType,
        docId: localDocument.id,
      });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      const messageText =
        error instanceof Error && error.message ? error.message : "PDF konnte nicht geladen werden.";
      toast.error(messageText);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async (docOverride?: Offer | Invoice) => {
    if (emailErrors.length > 0) return;
    setSending(true);
    try {
      const activeDocument = docOverride ?? localDocument;
      const toList = emailList(to);
      const ccList = emailList(cc);
      const bccList = emailList(bcc);

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
        toast.error(
          formatErrorToast({
            code: result.code,
            fallback: "E-Mail konnte nicht gesendet werden.",
          })
        );
        return;
      }

      const nowIso = new Date().toISOString();
      const nextData = {
        ...document,
        status:
          documentType === "invoice" && activeDocument.status === InvoiceStatus.ISSUED
            ? InvoiceStatus.SENT
            : activeDocument.status,
        sentAt: activeDocument.sentAt ?? nowIso,
        lastSentAt: nowIso,
        lastSentTo: toList.join(", "),
        sentCount: (activeDocument.sentCount ?? 0) + 1,
        sentVia: "EMAIL",
      } as Offer | Invoice;

      await onSent(nextData);
      toast.success("E-Mail wurde erfolgreich versendet.");
      onClose();
    } catch (error) {
      const errAny = error as { code?: string; message?: string } | null;
      toast.error(
        formatErrorToast({
          code: errAny?.code,
          message: errAny?.message,
          fallback: "E-Mail konnte nicht gesendet werden.",
        })
      );
    } finally {
      setSending(false);
    }
  };

  const handleFinalizeAndSend = async () => {
    if (!onFinalize) return;
    const next = await onFinalize();
    if (next) {
      setLocalDocument(next);
      await handleSend(next);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/50 p-4">
      <div className="w-full max-w-4xl rounded-t-2xl sm:rounded-xl bg-white shadow-xl safe-bottom">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Dokument senden</h3>
            <p className="text-sm text-gray-500">
              {documentType === "invoice" ? "Rechnung" : "Angebot"}{" "}
              {documentType === "invoice" ? localDocument.number ?? "Entwurf" : localDocument.number}
            </p>
          </div>
          <AppButton variant="ghost" onClick={onClose} aria-label="Schließen">
            <X size={18} />
          </AppButton>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">PDF Vorschau</div>
                <div className="flex items-center gap-2">
                  {previewUrl && (
                    <a
                      className="text-sm text-blue-600 underline"
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview öffnen
                    </a>
                  )}
                  <AppButton variant="secondary" onClick={loadPreview} disabled={previewLoading}>
                    <FileDown size={16} /> {previewLoading ? "Lädt..." : "Preview laden"}
                  </AppButton>
                </div>
              </div>
              {previewUrl ? (
                <iframe
                  title="PDF Preview"
                  src={previewUrl}
                  className="w-full h-[360px] border rounded"
                />
              ) : (
                <div className="border rounded bg-gray-50 text-sm text-gray-500 px-4 py-10 text-center">
                  Vorschau laden oder per Button öffnen.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empfänger</label>
                <input
                  className="w-full border rounded p-2"
                  placeholder="to@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                  <input
                    className="w-full border rounded p-2"
                    placeholder="cc@example.com"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
                  <input
                    className="w-full border rounded p-2"
                    placeholder="bcc@example.com"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
                <input
                  className="w-full border rounded p-2"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nachricht</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="font-semibold mb-1">Hinweise</div>
              <ul className="list-disc pl-5 space-y-1">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {emailErrors.length > 0 && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="font-semibold mb-1">Fehler</div>
              <ul className="list-disc pl-5 space-y-1">
                {emailErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end border-t px-6 py-4 bg-gray-50">
          <AppButton variant="secondary" onClick={onClose}>
            Abbrechen
          </AppButton>

          {documentType === "invoice" && localDocument.status === InvoiceStatus.DRAFT && (
            <>
              {onFinalize && (
                <AppButton
                  variant="secondary"
                  onClick={async () => {
                    const next = await onFinalize();
                    if (next) setLocalDocument(next);
                  }}
                >
                  Finalisieren
                </AppButton>
              )}
              {onFinalize && (
                <AppButton onClick={() => void handleFinalizeAndSend()} disabled={sending}>
                  Finalisieren & Senden
                </AppButton>
              )}
            </>
          )}

          <AppButton
            onClick={() => void handleSend()}
            disabled={sending || emailErrors.length > 0}
          >
            <Mail size={16} /> {sending ? "Sende..." : "Senden"}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
