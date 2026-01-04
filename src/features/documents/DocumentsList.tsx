// src/features/documents/DocumentsList.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ReceiptEuro, Check, Eye } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppButton as Button } from "@/ui/AppButton";
import { AppBadge as Badge } from "@/ui/AppBadge";
import { Alert } from "@/ui/Alert";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { DocumentCard } from "@/components/documents/DocumentCard";

import type { Client, UserSettings, Position, Invoice, Offer } from "@/types";
import { InvoiceStatus, OfferStatus, formatDate } from "@/types";
import { formatMoney } from "@/utils/money";
import { SMALL_BUSINESS_DEFAULT_NOTE } from "@/utils/smallBusiness";

import * as clientService from "@/app/clients/clientService";
import * as settingsService from "@/app/settings/settingsService";
import * as offerService from "@/app/offers/offerService";
import * as invoiceService from "@/app/invoices/invoiceService";

import { calcGross, calcNet, calcVat } from "@/domain/rules/money";
import { isOverdue as isInvoiceOverdue } from "@/domain/rules/invoiceRules";
import { canConvertToInvoice } from "@/domain/rules/offerRules";
import { DocumentEditor } from "./DocumentEditor";
import { formatDocumentStatus, formatInvoiceStatus, formatOfferStatus } from "@/features/documents/utils/formatStatus";
import { getErrorMessage, logError } from "@/utils/errors";

type EditorSeed = {
  id: string;
  number: string | null;
  date: string;
  dueDate?: string;
  validUntil?: string;
  vatRate: number;
  isSmallBusiness?: boolean;
  smallBusinessNote?: string | null;
  introText: string;
  footerText: string;
  currency?: string;
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
  isSmallBusiness?: boolean;
  smallBusinessNote?: string | null;
  currency?: string;
  status: InvoiceStatus | OfferStatus;
  offerId?: string;
  paymentDate?: string;
  introText: string;
  footerText: string;
  isLocked?: boolean;
  finalizedAt?: string | null;
  sentAt?: string | null;
  lastSentAt?: string | null;
  sentCount?: number;
  sentVia?: string | null;
  invoiceId?: string | null;
};

const toLocalISODate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayISO = () => toLocalISODate(new Date());
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export function DocumentsList({ type }: { type: "offer" | "invoice" }) {
  const isInvoice = type === "invoice";

  const [items, setItems] = useState<DocListItem[]>([]);
  const { confirm } = useConfirm();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
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
  const showEmptyState = !loading && items.length === 0 && !error;

  const getInvoiceStatusMeta = (status: InvoiceStatus, overdue: boolean) => {
    const label = formatInvoiceStatus(status, overdue);
    if (overdue || status === InvoiceStatus.OVERDUE) {
      return { label, tone: "red" as const };
    }

    if (status === InvoiceStatus.PAID) {
      return { label, tone: "green" as const };
    }

    if (status === InvoiceStatus.CANCELED) {
      return { label, tone: "gray" as const };
    }

    return { label, tone: "yellow" as const };
  };

  const getOfferStatusMeta = (status: OfferStatus) => {
    const label = formatOfferStatus(status);
    switch (status) {
      case OfferStatus.DRAFT:
        return { label, tone: "gray" as const };
      case OfferStatus.SENT:
        return { label, tone: "blue" as const };
      case OfferStatus.ACCEPTED:
        return { label, tone: "green" as const };
      case OfferStatus.REJECTED:
        return { label, tone: "red" as const };
      case OfferStatus.INVOICED:
        return { label, tone: "blue" as const };
      default:
        return { label, tone: "gray" as const };
    }
  };

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
            number: inv.number ?? "Entwurf",
            clientId: inv.clientId,
            projectId: inv.projectId,
            date: inv.date,
            dueDate: inv.dueDate,
            validUntil: undefined,
            positions: (inv.positions ?? []) as Position[],
            vatRate: Number(inv.vatRate ?? 0),
            isSmallBusiness: inv.isSmallBusiness ?? false,
            smallBusinessNote: inv.smallBusinessNote ?? null,
            currency: s.currency ?? "EUR",
            status: inv.status,
            offerId: inv.offerId,
            paymentDate: inv.paymentDate,
            introText: inv.introText ?? "",
            footerText: inv.footerText ?? "",
            isLocked: inv.isLocked ?? false,
            finalizedAt: inv.finalizedAt ?? null,
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
            currency: o.currency ?? s.currency ?? "EUR",
            status: o.status,
            offerId: undefined,
            paymentDate: undefined,
            introText: o.introText ?? "",
            footerText: o.footerText ?? "",
            sentAt: o.sentAt ?? null,
            lastSentAt: o.lastSentAt ?? null,
            sentCount: o.sentCount ?? 0,
            sentVia: o.sentVia ?? null,
            invoiceId: o.invoiceId ?? null,
          }))
        );
      }
    } catch (e) {
      logError(e);
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isInvoice]);

  useEffect(() => {
    void refresh();
  }, [refresh, type]);

  const openCreateRoute = () => {
    navigate("/app/invoices/new", { state: { backgroundLocation: location } });
  };

  // VIEW: immer frisch laden
  const openView = async (id: string) => {
    if (openingId) return;

    setOpeningId(id);
    try {
      const doc = isInvoice ? await invoiceService.getInvoice(id) : await offerService.getOffer(id);

      if (!doc) {
        toast.error("Dokument nicht gefunden (oder keine Berechtigung).");
        return;
      }

      setEditorReadOnly(true);
      setEditorStartInPrint(true);

      setEditorSeed({
        id: doc.id,
        number: (doc as any).number ?? null,
        date: (doc as any).date,
        dueDate: isInvoice ? (doc as Invoice).dueDate : undefined,
        validUntil: !isInvoice ? (doc as Offer).validUntil : undefined,
        vatRate: Number((doc as any).vatRate ?? 0),
        isSmallBusiness: isInvoice ? (doc as Invoice).isSmallBusiness ?? false : undefined,
        smallBusinessNote: isInvoice ? (doc as Invoice).smallBusinessNote ?? null : undefined,
        introText: (doc as any).introText ?? "",
        footerText: (doc as any).footerText ?? "",
        currency: (doc as any).currency ?? undefined,
      });

      setEditorInitial({
        id: doc.id,
        number: (doc as any).number ?? null,
        date: (doc as any).date,
        clientId: (doc as any).clientId ?? "",
        projectId: (doc as any).projectId ?? undefined,
        offerId: (doc as any).offerId ?? undefined,
        dueDate: (doc as any).dueDate ?? undefined,
        validUntil: (doc as any).validUntil ?? undefined,
        positions: (doc as any).positions ?? [],
        vatRate: Number((doc as any).vatRate ?? 0),
        isSmallBusiness: isInvoice ? (doc as Invoice).isSmallBusiness ?? false : undefined,
        smallBusinessNote: isInvoice ? (doc as Invoice).smallBusinessNote ?? null : undefined,
        status: (doc as any).status,
        introText: (doc as any).introText ?? "",
        footerText: (doc as any).footerText ?? "",
        paymentDate: (doc as any).paymentDate ?? undefined,
        isLocked: (doc as any).isLocked ?? false,
        finalizedAt: (doc as any).finalizedAt ?? null,
        sentAt: (doc as any).sentAt ?? null,
        lastSentAt: (doc as any).lastSentAt ?? null,
        sentCount: (doc as any).sentCount ?? 0,
        sentVia: (doc as any).sentVia ?? null,
        invoiceId: (doc as any).invoiceId ?? null,
        currency: (doc as any).currency ?? undefined,
      });

      setEditorOpen(true);
    } catch (e) {
      logError(e);
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setOpeningId(null);
    }
  };

  useEffect(() => {
    if (!isInvoice) return;
    const openId = (location.state as { openId?: string } | null)?.openId;
    if (!openId || typeof openId !== "string") return;
    void openView(openId);
    navigate(location.pathname, { replace: true, state: null });
  }, [isInvoice, location.pathname, location.state, navigate, openView]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "Dokument loeschen", message: "Wirklich loeschen?" });
    if (!ok) return;
    try {
      if (isInvoice) await invoiceService.deleteInvoice(id);
      else await offerService.deleteOffer(id);
      await refresh();
    } catch (e) {
      logError(e);
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    }
  };

  // Convert: immer vollständiges Angebot laden
  const handleConvertToInvoice = async (offerId: string) => {
    const ok = await confirm({ title: "Angebot umwandeln", message: "Angebot in Rechnung umwandeln?" });
    if (!ok) return;

    try {
      const s =
        settings ??
        (await settingsService.fetchSettings()) ??
        ({
          defaultVatRate: 0,
          defaultPaymentTerms: 14,
          isSmallBusiness: false,
          smallBusinessNote: SMALL_BUSINESS_DEFAULT_NOTE,
        } as unknown as UserSettings);

      setSettings(s);

      const offer = await offerService.getOffer(offerId);
      if (!offer) {
        toast.error("Angebot nicht gefunden.");
        return;
      }

      if (!canConvertToInvoice(offer)) {
        toast.error("Dieses Angebot kann nicht mehr umgewandelt werden.");
        return;
      }

      const invoiceId = newId();

      await invoiceService.saveInvoice({
        id: invoiceId,
        number: null,
        offerId: offer.id,
        clientId: offer.clientId,
        projectId: offer.projectId,
        date: todayISO(),
        dueDate: invoiceService.buildDueDate(todayISO(), Number(s.defaultPaymentTerms ?? 14)),
        positions: offer.positions ?? [],
        vatRate: Number(offer.vatRate ?? s.defaultVatRate ?? 0),
        isSmallBusiness: s.isSmallBusiness ?? false,
        smallBusinessNote: s.smallBusinessNote ?? SMALL_BUSINESS_DEFAULT_NOTE,
        status: InvoiceStatus.DRAFT,
        paymentDate: undefined,
        introText: offer.introText ?? "",
        footerText: offer.footerText ?? "",
      });

      await offerService.saveOffer({
        ...offer,
        status: offer.status === OfferStatus.INVOICED ? OfferStatus.SENT : offer.status,
        invoiceId: invoiceId,
      });

      toast.success("Rechnung erstellt!");
      await refresh();
    } catch (e) {
      logError(e);
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    }
  };

  const handleMarkPaid = async (invId: string) => {
    const ok = await confirm({ title: "Rechnung bezahlt", message: "Als bezahlt markieren?" });
    if (!ok) return;

    try {
      await invoiceService.markInvoicePaid(invId);
      await refresh();
    } catch (e) {
      logError(e);
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{isInvoice ? "Rechnungen" : "Angebote"}</h1>

        {isInvoice ? (
          <Button onClick={openCreateRoute} disabled={loading} className="w-full sm:w-auto justify-center">
            <Plus size={16} />
            Erstellen
          </Button>
        ) : (
          <Link to="/app/offers/new" state={{ backgroundLocation: location }} className="w-full sm:w-auto">
            <Button disabled={loading} className="w-full justify-center">
              <Plus size={16} />
              Erstellen
            </Button>
          </Link>
        )}
      </div>

      {error && <Alert tone="error" message={error} />}

      {showEmptyState && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {isInvoice ? "Noch keine Rechnungen" : "Noch keine Angebote"}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {isInvoice
              ? "Erstellen Sie Ihre erste Rechnung, um den Überblick zu behalten."
              : "Erstellen Sie Ihr erstes Angebot, um loszulegen."}
          </p>
          <div className="mt-4 flex justify-center">
            {isInvoice ? (
              <Button onClick={openCreateRoute}>
                <Plus size={16} />
                Rechnung erstellen
              </Button>
            ) : (
              <Link to="/app/offers/new" state={{ backgroundLocation: location }}>
                <Button>
                  <Plus size={16} />
                  Angebot erstellen
                </Button>
              </Link>
            )}
          </div>
        </div>
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

      <div className="md:hidden space-y-4">
        {items.map((item) => {
          const net = calcNet(item.positions ?? []);
          const isSmallBusiness = isInvoice ? (item as Invoice).isSmallBusiness : false;
          const vat = isSmallBusiness ? 0 : calcVat(net, item.vatRate);
          const total = isSmallBusiness ? net : calcGross(net, vat);
          const locale = settings?.locale ?? "de-DE";
          const invoiceCurrency = settings?.currency ?? "EUR";
          const offerCurrency = item.currency ?? settings?.currency ?? "EUR";
          const overdue =
            isInvoice &&
            item.status !== InvoiceStatus.PAID &&
            item.status !== InvoiceStatus.CANCELED &&
            isInvoiceOverdue({ status: item.status as InvoiceStatus, dueDate: item.dueDate }, new Date());

          if (isInvoice) {
            const statusMeta = getInvoiceStatusMeta(item.status as InvoiceStatus, overdue);

            return (
              <DocumentCard
                key={item.id}
                variant="invoice"
                documentLabel="Rechnung"
                number={item.number}
                date={item.date ? formatDate(item.date, settings?.locale) : "—"}
                amount={formatMoney(total, invoiceCurrency, locale)}
                clientName={getClientName(item.clientId)}
                statusLabel={statusMeta.label}
                statusTone={statusMeta.tone}
                primaryAction={
                  <button
                    type="button"
                    onClick={() => void openView(item.id)}
                    title="Rechnung ansehen"
                    aria-label="Rechnung ansehen"
                    className="h-11 w-11 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500/60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    disabled={openingId === item.id}
                  >
                    <Eye size={18} />
                  </button>
                }
                secondaryAction={
                  [InvoiceStatus.ISSUED, InvoiceStatus.SENT, InvoiceStatus.OVERDUE].includes(
                    item.status as InvoiceStatus
                  ) ? (
                    <Button variant="secondary" onClick={() => void handleMarkPaid(item.id)}>
                      <Check size={16} /> Als bezahlt
                    </Button>
                  ) : undefined
                }
                menuActions={
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trash2 size={14} /> Löschen
                    </span>
                  </button>
                }
              />
            );
          }

          const offerMeta = getOfferStatusMeta(item.status as OfferStatus);

          return (
            <DocumentCard
              key={item.id}
              variant="quote"
              documentLabel="Angebot"
              number={item.number}
              date={item.date ? formatDate(item.date, settings?.locale) : "—"}
              amount={formatMoney(total, offerCurrency, locale)}
              clientName={getClientName(item.clientId)}
              statusLabel={offerMeta.label}
              statusTone={offerMeta.tone}
              metadata={
                <div className="space-y-1 text-xs text-gray-500 dark:text-slate-400">
                  {item.invoiceId && (
                    <div>
                      <Link to={`/app/documents/invoice/${item.invoiceId}`} className="underline">
                        Rechnung erstellt
                      </Link>{" "}
                      <span className="text-gray-400">- {item.invoiceId}</span>
                    </div>
                  )}
                  <div>
                    {item.sentCount && item.lastSentAt
                      ? `Gesendet ${item.sentCount}x – zuletzt ${formatDate(item.lastSentAt, settings?.locale)}`
                      : "Noch nicht gesendet"}
                  </div>
                </div>
              }
              primaryAction={
                <Button
                  onClick={() => void handleConvertToInvoice(item.id)}
                  className="bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-500/60"
                >
                  <ReceiptEuro size={16} /> Zu Rechnung
                </Button>
              }
              secondaryAction={
                <button
                  type="button"
                  onClick={() => void openView(item.id)}
                  title="Angebot ansehen"
                  aria-label="Angebot ansehen"
                  className="h-11 w-11 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500/60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  disabled={openingId === item.id}
                >
                  <Eye size={18} />
                </button>
              }
              menuActions={
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 size={14} /> Löschen
                  </span>
                </button>
              }
            />
          );
        })}

        {!showEmptyState && items.length === 0 && !loading && (
          <div className="app-card text-center text-gray-500">Keine Dokumente gefunden.</div>
        )}

        {loading && <div className="app-card text-center text-gray-500">Lade...</div>}
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow border overflow-hidden">
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
              const isSmallBusiness = isInvoice ? (item as Invoice).isSmallBusiness : false;
              const vat = isSmallBusiness ? 0 : calcVat(net, item.vatRate);
              const total = isSmallBusiness ? net : calcGross(net, vat);
              const locale = settings?.locale ?? "de-DE";
              const invoiceCurrency = settings?.currency ?? "EUR";
              const offerCurrency = item.currency ?? settings?.currency ?? "EUR";

              const overdue =
                isInvoice &&
                item.status !== InvoiceStatus.PAID &&
                item.status !== InvoiceStatus.CANCELED &&
                isInvoiceOverdue({ status: item.status as InvoiceStatus, dueDate: item.dueDate }, new Date());

              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{item.number}</td>
                  <td className="p-4">{getClientName(item.clientId)}</td>
                  <td className="p-4 text-sm text-gray-500">{item.date ? formatDate(item.date, settings?.locale) : "—"}</td>
                  <td className="p-4 font-mono">
                    {formatMoney(total, isInvoice ? invoiceCurrency : offerCurrency, locale)}
                  </td>

                  <td className="p-4">
                    {overdue && <Badge color="red">Overdue</Badge>}
                    {!overdue && (
                      <div className="space-y-1">
                        <Badge
                          color={
                            item.status === InvoiceStatus.PAID ||
                            item.status === OfferStatus.ACCEPTED ||
                            item.status === OfferStatus.INVOICED
                              ? "green"
                              : item.status === InvoiceStatus.OVERDUE
                              ? "red"
                              : item.status === OfferStatus.SENT ||
                                item.status === InvoiceStatus.SENT ||
                                item.status === InvoiceStatus.ISSUED
                              ? "blue"
                              : item.status === OfferStatus.REJECTED
                              ? "red"
                              : "gray"
                          }
                        >
                          {formatDocumentStatus(type, item.status, { isOverdue: overdue })}
                        </Badge>

                        {!isInvoice && item.invoiceId && (
                          <div className="text-xs text-gray-600">
                            <Link to={`/app/documents/invoice/${item.invoiceId}`} className="underline">
                              Invoice created
                            </Link>{" "}
                            <span className="text-gray-400">- {item.invoiceId}</span>
                          </div>
                        )}

                        {!isInvoice && (
                          <div className="text-xs text-gray-500">
                            {item.sentCount && item.lastSentAt
                              ? `Sent ${item.sentCount}x - zuletzt ${formatDate(item.lastSentAt, settings?.locale)}`
                              : "Not sent yet"}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {!isInvoice && (
                        <button
                          onClick={() => void handleConvertToInvoice(item.id)}
                          title="In Rechnung wandeln"
                          aria-label="In Rechnung wandeln"
                          className="h-11 w-11 inline-flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <ReceiptEuro size={18} />
                        </button>
                      )}

                      {isInvoice &&
                        [InvoiceStatus.ISSUED, InvoiceStatus.SENT, InvoiceStatus.OVERDUE].includes(
                          item.status as InvoiceStatus
                        ) && (
                        <button
                          onClick={() => void handleMarkPaid(item.id)}
                          title="Als bezahlt markieren"
                          aria-label="Als bezahlt markieren"
                          className="h-11 w-11 inline-flex items-center justify-center text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check size={18} />
                        </button>
                      )}

                      <button
                        onClick={() => void openView(item.id)}
                        title={isInvoice ? "Rechnung ansehen" : "Angebot ansehen"}
                        aria-label={isInvoice ? "Rechnung ansehen" : "Angebot ansehen"}
                        className="h-11 w-11 inline-flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
                        disabled={openingId === item.id}
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        onClick={() => void handleDelete(item.id)}
                        className="h-11 w-11 inline-flex items-center justify-center text-gray-400 hover:text-red-500 rounded"
                        title="Löschen"
                        aria-label="Löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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
