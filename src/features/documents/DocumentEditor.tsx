// src/features/documents/DocumentEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { X, Trash2, Plus, FileDown, Mail } from "lucide-react";

import type { Client, UserSettings, Position } from "@/types";
import { InvoiceStatus, OfferStatus, formatCurrency, formatDate } from "@/types";

import { AppButton } from "@/ui/AppButton";

import * as offerService from "@/app/offers/offerService";
import * as invoiceService from "@/app/invoices/invoiceService";
import { calcGross, calcNet, calcVat } from "@/domain/rules/money";
import { downloadDocumentPdf, fetchDocumentPdf } from "@/app/pdf/documentPdfService";
import { sendDocumentEmail } from "@/app/email/emailService";

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
  const [showPrint, setShowPrint] = useState(startInPrint);

  const [formData, setFormData] = useState<FormData>(() =>
    buildFormData(seed, initial, isInvoice)
  );

  // ✅ WICHTIG: wenn seed/initial wechseln (Viewer lädt async), state neu setzen
  useEffect(() => {
    setFormData(buildFormData(seed, initial, isInvoice));
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

  const disabled = readOnly || saving;

  const addPosition = () => {
    if (readOnly) return;
    setFormData((prev) => ({
      ...prev,
      positions: [
        ...(prev.positions ?? []),
        { id: newId(), description: "", quantity: 1, unit: "Std", price: 0 },
      ],
    }));
  };

  const updatePosition = (index: number, field: keyof Position, value: any) => {
    if (readOnly) return;
    setFormData((prev) => {
      const positions = [...(prev.positions ?? [])];
      positions[index] = { ...positions[index], [field]: value };
      return { ...prev, positions };
    });
  };

  const removePosition = (index: number) => {
    if (readOnly) return;
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

  const handleSave = async (opts?: { closeAfterSave?: boolean }): Promise<boolean> => {
    if (readOnly) return false;

    const closeAfterSave = opts?.closeAfterSave ?? true;

    if (!formData.clientId) {
      alert("Bitte Kunde wählen");
      return false;
    }
    if (isInvoice && !formData.dueDate) {
      alert("Bitte Fälligkeitsdatum setzen");
      return false;
    }
    if (!isInvoice && !formData.validUntil) {
      alert("Bitte Gültig-bis Datum setzen");
      return false;
    }

    setSaving(true);
    try {
      if (isInvoice) {
        await invoiceService.saveInvoice({
          id: formData.id,
          number: formData.number,
          offerId: formData.offerId,
          clientId: formData.clientId,
          projectId: formData.projectId,
          date: formData.date,
          dueDate: formData.dueDate!,
          positions: formData.positions ?? [],
          vatRate: toNumberOrZero(formData.vatRate),
          status: (formData.status as InvoiceStatus) ?? InvoiceStatus.DRAFT,
          paymentDate: formData.paymentDate,
          introText: formData.introText ?? "",
          footerText: formData.footerText ?? "",
        });
      } else {
        await offerService.saveOffer({
          id: formData.id,
          number: formData.number,
          clientId: formData.clientId,
          projectId: formData.projectId,
          date: formData.date,
          validUntil: formData.validUntil!,
          positions: formData.positions ?? [],
          vatRate: toNumberOrZero(formData.vatRate),
          introText: formData.introText ?? "",
          footerText: formData.footerText ?? "",
          status: (formData.status as OfferStatus) ?? OfferStatus.DRAFT,
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
    const client = clients.find((c) => c.id === formData.clientId);
    await downloadDocumentPdf({
      type: isInvoice ? "invoice" : "offer",
      doc: formData as any,
      settings,
      client: client ?? {},
    });
  };

  const handleSendEmail = async () => {
    const client = clients.find((c) => c.id === formData.clientId);
    const templateData = {
      dokument: isInvoice ? "Rechnung" : "Angebot",
      nummer: formData.number ?? "",
      datum: formData.date ?? "",
      kunde: client?.companyName ?? "",
      firma: settings.companyName ?? "",
    };
    const defaultSubjectTemplate =
      settings.emailDefaultSubject?.trim() || `${isInvoice ? "Rechnung" : "Angebot"} {nummer}`;
    const defaultSubject = applyTemplate(defaultSubjectTemplate, templateData);
    const defaultMessageTemplate =
      settings.emailDefaultText?.trim() || "Bitte im Anhang finden Sie das Dokument.";
    const defaultMessage = applyTemplate(defaultMessageTemplate, templateData);

    const to = client?.email?.trim() || "";
    if (!to) {
      alert("Bitte beim Kunden eine E-Mail-Adresse hinterlegen.");
      return;
    }
    const senderIdentityId = settings.defaultSenderIdentityId ?? "";
    if (!senderIdentityId) {
      alert("Bitte in den Einstellungen eine verifizierte Reply-To Adresse setzen.");
      return;
    }

    const subject = defaultSubject.trim() || `${isInvoice ? "Rechnung" : "Angebot"} ${formData.number}`;
    const message = defaultMessage.trim() || "Bitte im Anhang finden Sie das Dokument.";

    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`;
    const mailLink = document.createElement("a");
    mailLink.href = mailtoUrl;
    mailLink.style.display = "none";
    document.body.appendChild(mailLink);
    mailLink.click();
    mailLink.remove();

    const { blob, filename } = await fetchDocumentPdf({
      type: isInvoice ? "invoice" : "offer",
      doc: formData as any,
      settings,
      client: client ?? {},
    });
    const base64 = await blobToBase64(blob);

    try {
      await sendDocumentEmail({
        documentId: formData.id,
        documentType: isInvoice ? "invoice" : "offer",
        to,
        subject,
        message,
        pdfBase64: base64.replace(/^data:application\/pdf;base64,/, ""),
        filename,
        senderIdentityId,
      });
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "E-Mail konnte nicht automatisch gesendet werden."
      );
    }

    if (!readOnly && formData.status === (isInvoice ? InvoiceStatus.DRAFT : OfferStatus.DRAFT)) {
      // mark as sent locally
      setFormData((prev) => ({
        ...prev,
        status: isInvoice ? InvoiceStatus.SENT : OfferStatus.SENT,
      }));
      await handleSave({ closeAfterSave: false });
    }

    if (!readOnly) {
      alert("E-Mail wurde vorbereitet. Falls SMTP konfiguriert ist, wurde sie auch versendet.");
    }
  };

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // ---------- Print Overlay ----------
  if (showPrint) {
    const client = clients.find((c) => c.id === formData.clientId);

    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto">
        <div className="max-w-[210mm] mx-auto p-[10mm] min-h-screen bg-white shadow-none print:shadow-none">
          <div className="no-print flex justify-between mb-8 p-4 bg-gray-100 rounded-lg">
            <AppButton
              variant="secondary"
              onClick={() => {
                if (readOnly) onClose();
                else setShowPrint(false);
              }}
            >
              {readOnly ? "Schließen" : "Zurück zum Editor"}
            </AppButton>

            <div className="flex gap-2">
              <AppButton variant="secondary" onClick={() => void handleDownloadPdf()}>
                <FileDown size={16} /> PDF herunterladen
              </AppButton>

              <AppButton variant="secondary" onClick={() => void handleSendEmail()}>
                <Mail size={16} /> E-Mail
              </AppButton>
            </div>
          </div>

          <div className="flex justify-between mb-12">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{settings.companyName}</h1>
              <p className="text-sm text-gray-500 whitespace-pre-line">{settings.address}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isInvoice ? "RECHNUNG" : "ANGEBOT"}
              </h2>
              <p className="text-gray-500">Nr: {formData.number}</p>
              <p className="text-gray-500">Datum: {formatDate(formData.date)}</p>
              {isInvoice && formData.dueDate && (
                <p className="text-gray-500">Fällig: {formatDate(formData.dueDate)}</p>
              )}
              {!isInvoice && formData.validUntil && (
                <p className="text-gray-500">Gültig bis: {formatDate(formData.validUntil)}</p>
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
              {isInvoice ? `Rechnung ${formData.number}` : `Angebot ${formData.number}`}
            </h3>

            {formData.introText && (
              <p className="mb-6 whitespace-pre-line text-sm">{formData.introText}</p>
            )}

            <table className="w-full text-left text-sm">
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
                    <td className="py-3 text-right">{formatCurrency(toNumberOrZero(pos.price))}</td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(toNumberOrZero(pos.quantity) * toNumberOrZero(pos.price))}
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
                <tr>
                  <td colSpan={3} className="pt-4 text-right">
                    Zwischensumme:
                  </td>
                  <td className="pt-4 text-right">{formatCurrency(totals.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right text-gray-500">
                    Umsatzsteuer ({toNumberOrZero(formData.vatRate)}%):
                  </td>
                  <td className="text-right text-gray-500">{formatCurrency(totals.tax)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="pt-2 text-right font-bold text-lg">
                    Gesamtsumme:
                  </td>
                  <td className="pt-2 text-right font-bold text-lg">{formatCurrency(totals.total)}</td>
                </tr>
              </tfoot>
            </table>
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
      </div>
    );
  }

  // ---------- Normal Editor ----------
  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">
            {readOnly
              ? isInvoice
                ? "Rechnung ansehen"
                : "Angebot ansehen"
              : isInvoice
              ? "Rechnung bearbeiten"
              : "Angebot bearbeiten"}
          </h2>
          <AppButton variant="ghost" onClick={onClose}>
            <X size={20} />
          </AppButton>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
              <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Nummer</label>
              <input
                className="w-full border rounded p-2"
                value={formData.number}
                disabled={disabled}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Fällig am</label>
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={formData.dueDate ?? ""}
                  disabled={disabled}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MwSt (%)</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={formData.vatRate ?? 0}
                  disabled={disabled}
                  onChange={(e) =>
                    setFormData({ ...formData, vatRate: toNumberOrZero(e.target.value) })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gültig bis</label>
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={formData.validUntil ?? ""}
                  disabled={disabled}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MwSt (%)</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={formData.vatRate ?? 0}
                  disabled={disabled}
                  onChange={(e) =>
                    setFormData({ ...formData, vatRate: toNumberOrZero(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Einleitungstext</label>
            <textarea
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
                <div key={pos.id ?? idx} className="flex gap-2 items-start">
                  <div className="flex-[3]">
                    <input
                      className="w-full border rounded p-2"
                      placeholder="Beschreibung"
                      value={pos.description ?? ""}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "description", e.target.value)}
                    />
                  </div>

                  <div className="w-20">
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      placeholder="Menge"
                      value={pos.quantity ?? 0}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "quantity", toNumberOrZero(e.target.value))}
                    />
                  </div>

                  <div className="w-20">
                    <input
                      className="w-full border rounded p-2"
                      placeholder="Einh."
                      value={pos.unit ?? ""}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "unit", e.target.value)}
                    />
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      placeholder="Preis"
                      value={pos.price ?? 0}
                      disabled={disabled}
                      onChange={(e) => updatePosition(idx, "price", toNumberOrZero(e.target.value))}
                    />
                  </div>

                  {!readOnly && (
                    <button
                      onClick={() => removePosition(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
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
            <div className="w-64 space-y-2 text-right">
              <div className="flex justify-between">
                <span>Netto:</span> <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>MwSt ({toNumberOrZero(formData.vatRate)}%):</span>{" "}
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Gesamt:</span> <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fußtext</label>
            <textarea
              className="w-full border rounded p-2"
              rows={2}
              value={formData.footerText ?? ""}
              disabled={disabled}
              onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
            />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between items-center rounded-b-xl">
          <AppButton variant="ghost" onClick={onClose}>
            Schließen
          </AppButton>

          <div className="flex gap-2">
            <AppButton
              variant="secondary"
              disabled={saving}
              onClick={async () => {
                if (readOnly) {
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

            <AppButton onClick={() => void handleSendEmail()}>
              <Mail size={16} /> Per E-Mail senden
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
