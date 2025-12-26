// src/features/documents/DocumentsList.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ReceiptEuro, Check, Eye } from "lucide-react";

import { AppButton as Button } from "@/ui/AppButton";
import { AppBadge as Badge } from "@/ui/AppBadge";

import type { Client, UserSettings, Position, Invoice, Offer } from "@/types";
import { InvoiceStatus, OfferStatus, formatCurrency, formatDate } from "@/types";

import * as clientService from "@/app/clients/clientService";
import * as settingsService from "@/app/settings/settingsService";
import * as offerService from "@/app/offers/offerService";
import * as invoiceService from "@/app/invoices/invoiceService";
import { getNextDocumentNumber } from "@/app/numbering/numberingService";

import { calcGross, calcNet, calcVat } from "@/domain/rules/money";
import { isOverdue as isInvoiceOverdue } from "@/domain/rules/invoiceRules";
import { canConvertToInvoice } from "@/domain/rules/offerRules";
import { DocumentEditor } from "./DocumentEditor";

type EditorSeed = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  vatRate: number;
  introText: string;
  footerText: string;
};

type DocListItem = {
  id: string;
  number: string;
  clientId: string;
  projectId?: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  positions: Position[];
  vatRate: number;
  status: InvoiceStatus | OfferStatus;
  offerId?: string;
  paymentDate?: string;
  introText: string;
  footerText: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export function DocumentsList({ type }: { type: "offer" | "invoice" }) {
  const isInvoice = type === "invoice";

  const [items, setItems] = useState<DocListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);

  const [editorReadOnly, setEditorReadOnly] = useState(false);
  const [editorStartInPrint, setEditorStartInPrint] = useState(false);
  const [editorInitial, setEditorInitial] = useState<any>(null);

  const [openingId, setOpeningId] = useState<string | null>(null);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.companyName);
    return map;
  }, [clients]);

  const getClientName = (id: string) => clientNameById.get(id) || "Unknown";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cs, s, docs] = await Promise.all([
        clientService.list(),
        settingsService.fetchSettings(),
        isInvoice ? invoiceService.listInvoices() : offerService.listOffers(),
      ]);

      setClients(cs);
      setSettings(s);

      if (isInvoice) {
        const invs = docs as Invoice[];
        setItems(
          invs.map((inv) => ({
            id: inv.id,
            number: inv.number,
            clientId: inv.clientId,
            projectId: inv.projectId,
            date: inv.date,
            dueDate: inv.dueDate,
            validUntil: undefined,
            positions: (inv.positions ?? []) as Position[],
            vatRate: Number(inv.vatRate ?? 0),
            status: inv.status,
            offerId: inv.offerId,
            paymentDate: inv.paymentDate,
            introText: inv.introText ?? "",
            footerText: inv.footerText ?? "",
          }))
        );
      } else {
        const offers = docs as Offer[];
        setItems(
          offers.map((o) => ({
            id: o.id,
            number: o.number,
            clientId: o.clientId,
            projectId: o.projectId,
            date: o.date,
            dueDate: undefined,
            validUntil: o.validUntil,
            positions: (o.positions ?? []) as Position[],
            vatRate: Number(o.vatRate ?? 0),
            status: o.status,
            offerId: undefined,
            paymentDate: undefined,
            introText: o.introText ?? "",
            footerText: o.footerText ?? "",
          }))
        );
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  }, [isInvoice]);

  useEffect(() => {
    void refresh();
  }, [refresh, type]);

  const openNewEditor = async () => {
    try {
      const s =
        settings ??
        (await settingsService.fetchSettings()) ??
        ({ defaultVatRate: 0, defaultPaymentTerms: 14 } as unknown as UserSettings);

      setSettings(s);

      // reset view flags
      setEditorReadOnly(false);
      setEditorStartInPrint(false);
      setEditorInitial(null);

      const num = await getNextDocumentNumber(type, s);

      const seed: EditorSeed = {
        id: newId(),
        number: num,
        date: todayISO(),
        dueDate: isInvoice ? invoiceService.buildDueDate(todayISO(), Number(s.defaultPaymentTerms ?? 14)) : undefined,
        validUntil: !isInvoice ? addDaysISO(14) : undefined,
        vatRate: Number(s.defaultVatRate ?? 0),
        introText: isInvoice ? "" : "Gerne unterbreite ich Ihnen folgendes Angebot:",
        footerText: isInvoice
          ? `Zahlbar innerhalb von ${Number(s.defaultPaymentTerms ?? 14)} Tagen ohne Abzug.`
          : "Ich freue mich auf Ihre Rückmeldung.",
      };

      setEditorSeed(seed);
      setEditorOpen(true);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      alert(msg);
    }
  };

  // VIEW: immer frisch laden
  const openView = async (id: string) => {
    if (openingId) return;

    setOpeningId(id);
    try {
      const doc = isInvoice ? await invoiceService.getInvoice(id) : await offerService.getOffer(id);

      if (!doc) {
        alert("Dokument nicht gefunden (oder keine Berechtigung).");
        return;
      }

      setEditorReadOnly(true);
      setEditorStartInPrint(true);

      setEditorSeed({
        id: doc.id,
        number: String((doc as any).number ?? ""),
        date: (doc as any).date,
        dueDate: isInvoice ? (doc as Invoice).dueDate : undefined,
        validUntil: !isInvoice ? (doc as Offer).validUntil : undefined,
        vatRate: Number((doc as any).vatRate ?? 0),
        introText: (doc as any).introText ?? "",
        footerText: (doc as any).footerText ?? "",
      });

      setEditorInitial({
        id: doc.id,
        number: String((doc as any).number ?? ""),
        date: (doc as any).date,
        clientId: (doc as any).clientId ?? "",
        projectId: (doc as any).projectId ?? undefined,
        offerId: (doc as any).offerId ?? undefined,
        dueDate: (doc as any).dueDate ?? undefined,
        validUntil: (doc as any).validUntil ?? undefined,
        positions: (doc as any).positions ?? [],
        vatRate: Number((doc as any).vatRate ?? 0),
        status: (doc as any).status,
        introText: (doc as any).introText ?? "",
        footerText: (doc as any).footerText ?? "",
        paymentDate: (doc as any).paymentDate ?? undefined,
      });

      setEditorOpen(true);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      alert(msg);
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Wirklich löschen?")) return;
    try {
      if (isInvoice) await invoiceService.deleteInvoice(id);
      else await offerService.deleteOffer(id);
      await refresh();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      alert(msg);
    }
  };

  // Convert: immer vollständiges Angebot laden
  const handleConvertToInvoice = async (offerId: string) => {
    if (!confirm("Angebot in Rechnung umwandeln?")) return;

    try {
      const s =
        settings ??
        (await settingsService.fetchSettings()) ??
        ({ defaultVatRate: 0, defaultPaymentTerms: 14 } as unknown as UserSettings);

      setSettings(s);

      const offer = await offerService.getOffer(offerId);
      if (!offer) {
        alert("Angebot nicht gefunden.");
        return;
      }

      if (!canConvertToInvoice(offer)) {
        alert("Dieses Angebot kann nicht mehr umgewandelt werden.");
        return;
      }

      const invoiceNumber = await getNextDocumentNumber("invoice", s);

      await invoiceService.saveInvoice({
        id: newId(),
        number: String(invoiceNumber),
        offerId: offer.id,
        clientId: offer.clientId,
        projectId: offer.projectId,
        date: todayISO(),
        dueDate: invoiceService.buildDueDate(todayISO(), Number(s.defaultPaymentTerms ?? 14)),
        positions: offer.positions ?? [],
        vatRate: Number(offer.vatRate ?? s.defaultVatRate ?? 0),
        status: InvoiceStatus.SENT,
        paymentDate: undefined,
        introText: offer.introText ?? "",
        footerText: offer.footerText ?? "",
      });

      await offerService.saveOffer({
        ...offer,
        status: OfferStatus.INVOICED,
      });

      alert("Rechnung erstellt!");
      await refresh();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      alert(msg);
    }
  };

  const handleMarkPaid = async (invId: string) => {
    if (!confirm("Als bezahlt markieren?")) return;

    try {
      const inv = await invoiceService.getInvoice(invId);
      if (!inv) {
        alert("Rechnung nicht gefunden.");
        return;
      }

      if (!inv.dueDate) {
        alert("Fehler: Rechnung hat kein Fälligkeitsdatum (dueDate).");
        return;
      }

      const paidAt = new Date().toISOString();

      await invoiceService.saveInvoice({
        ...inv,
        status: InvoiceStatus.PAID,
        paymentDate: paidAt,
      });

      await refresh();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{isInvoice ? "Rechnungen" : "Angebote"}</h1>

        <Button onClick={openNewEditor} disabled={loading}>
          <Plus size={16} />
          Erstellen
        </Button>
      </div>

      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">{error}</div>
      )}

      {editorOpen && editorSeed && settings && (
        <DocumentEditor
          type={type}
          seed={editorSeed}
          settings={settings}
          clients={clients}
          onClose={() => {
            setEditorOpen(false);
            setEditorReadOnly(false);
            setEditorStartInPrint(false);
            setEditorInitial(null);
          }}
          onSaved={refresh}
          readOnly={editorReadOnly}
          startInPrint={editorStartInPrint}
          initial={editorInitial ?? undefined}
        />
      )}

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-600">Nummer</th>
              <th className="p-4 font-medium text-gray-600">Kunde</th>
              <th className="p-4 font-medium text-gray-600">Datum</th>
              <th className="p-4 font-medium text-gray-600">Betrag</th>
              <th className="p-4 font-medium text-gray-600">Status</th>
              <th className="p-4 font-medium text-gray-600 text-right">Aktionen</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {items.map((item) => {
              const net = calcNet(item.positions ?? []);
              const vat = calcVat(net, item.vatRate);
              const total = calcGross(net, vat);

              const overdue =
                isInvoice &&
                item.status !== InvoiceStatus.PAID &&
                isInvoiceOverdue({ status: item.status as InvoiceStatus, dueDate: item.dueDate }, new Date());

              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{item.number}</td>
                  <td className="p-4">{getClientName(item.clientId)}</td>
                  <td className="p-4 text-sm text-gray-500">{item.date ? formatDate(item.date) : "—"}</td>
                  <td className="p-4 font-mono">{formatCurrency(total)}</td>

                  <td className="p-4">
                    {overdue && <Badge color="red">Überfällig</Badge>}
                    {!overdue && (
                      <Badge
                        color={
                          item.status === InvoiceStatus.PAID ||
                          item.status === OfferStatus.ACCEPTED ||
                          item.status === OfferStatus.INVOICED
                            ? "green"
                            : item.status === OfferStatus.SENT || item.status === InvoiceStatus.SENT
                            ? "blue"
                            : item.status === OfferStatus.REJECTED
                            ? "red"
                            : "gray"
                        }
                      >
                        {item.status}
                      </Badge>
                    )}
                  </td>

                  <td className="p-4 text-right flex gap-2 justify-end">
                    {!isInvoice && (
                      <button
                        onClick={() => void handleConvertToInvoice(item.id)}
                        title="In Rechnung wandeln"
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <ReceiptEuro size={18} />
                      </button>
                    )}

                    {isInvoice && item.status !== InvoiceStatus.PAID && (
                      <button
                        onClick={() => void handleMarkPaid(item.id)}
                        title="Als bezahlt markieren"
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check size={18} />
                      </button>
                    )}

                    <button
                      onClick={() => void openView(item.id)}
                      title={isInvoice ? "Rechnung ansehen" : "Angebot ansehen"}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      disabled={openingId === item.id}
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      onClick={() => void handleDelete(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded"
                      title="Löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Keine Dokumente gefunden.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Lade...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
