import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { Client, Invoice, Offer } from "@/types";
import { InvoiceStatus, OfferStatus, formatDate } from "@/types";
import { calculateDocumentTotal, formatCurrencyEur, isInvoiceOverdue, isInvoiceOpen } from "@/utils/dashboard";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import * as clientService from "@/app/clients/clientService";
import * as offerService from "@/app/offers/offerService";
import * as invoiceService from "@/app/invoices/invoiceService";
import { formatInvoiceStatus, formatOfferStatus } from "@/features/documents/utils/formatStatus";

type FilterMode = "all" | "offer" | "invoice";
type InvoiceFilterStatus = "DRAFT" | "OPEN" | "OVERDUE" | "PAID";
type CombinedStatus = OfferStatus | InvoiceFilterStatus;

type DocumentRow = {
  id: string;
  type: "offer" | "invoice";
  number: string;
  clientName: string;
  date: string;
  createdAt?: string;
  amountLabel: string;
  statusLabel: string;
  statusTone: "gray" | "blue" | "green" | "red" | "yellow";
  statusKey: CombinedStatus;
  dueDate?: string;
  validUntil?: string;
  isOverdue?: boolean;
};

const invoiceStatusLabel = (status: InvoiceFilterStatus) => {
  if (status === "OPEN") {
    return formatInvoiceStatus(InvoiceStatus.ISSUED);
  }
  if (status === "OVERDUE") {
    return formatInvoiceStatus(InvoiceStatus.OVERDUE, true);
  }
  return formatInvoiceStatus(status as InvoiceStatus);
};

const offerStatusTone = (status: OfferStatus): DocumentRow["statusTone"] => {
  switch (status) {
    case OfferStatus.ACCEPTED:
      return "green";
    case OfferStatus.REJECTED:
      return "red";
    case OfferStatus.SENT:
    case OfferStatus.INVOICED:
      return "blue";
    default:
      return "gray";
  }
};

const invoiceStatusTone = (status: InvoiceFilterStatus): DocumentRow["statusTone"] => {
  switch (status) {
    case "OVERDUE":
      return "red";
    case "OPEN":
      return "yellow";
    case "PAID":
      return "green";
    default:
      return "gray";
  }
};

const buildInvoiceStatus = (invoice: Invoice, today: Date): InvoiceFilterStatus => {
  if (invoice.status === InvoiceStatus.PAID) return "PAID";
  if (invoice.status === InvoiceStatus.DRAFT) return "DRAFT";
  if (isInvoiceOverdue(invoice, today)) return "OVERDUE";
  if (isInvoiceOpen(invoice)) return "OPEN";
  return "OPEN";
};

const getTimestamp = (value?: string) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const getRowDocumentTimestamp = (row: DocumentRow) =>
  getTimestamp(row.date) ?? getTimestamp(row.createdAt) ?? 0;

export default function DocumentsHubPage() {
  const [mode, setMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<CombinedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientData, offerData, invoiceData] = await Promise.all([
          clientService.list(),
          offerService.listOffers(),
          invoiceService.listInvoices(),
        ]);
        if (!mounted) return;
        setClients(clientData);
        setOffers(offerData);
        setInvoices(invoiceData);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const param = searchParams.get("mode") ?? searchParams.get("type");
    if (!param) return;
    const normalized = param.toLowerCase();
    if (normalized === "invoice" || normalized === "invoices") {
      setMode("invoice");
    } else if (normalized === "offer" || normalized === "offers") {
      setMode("offer");
    } else if (normalized === "all") {
      setMode("all");
    }
  }, [searchParams]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setSelectedStatuses([]);
  }, [mode]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => map.set(client.id, client.companyName));
    return map;
  }, [clients]);

  const statusOptions = useMemo((): CombinedStatus[] => {
    if (mode === "offer") {
      return [
        OfferStatus.DRAFT,
        OfferStatus.SENT,
        OfferStatus.ACCEPTED,
        OfferStatus.REJECTED,
        OfferStatus.INVOICED,
      ];
    }
    if (mode === "invoice") {
      return ["DRAFT", "OPEN", "OVERDUE", "PAID"];
    }
    return [
      OfferStatus.DRAFT,
      OfferStatus.SENT,
      OfferStatus.ACCEPTED,
      OfferStatus.REJECTED,
      OfferStatus.INVOICED,
      "OPEN",
      "OVERDUE",
      "PAID",
    ];
  }, [mode]);

  const statusLabel = useMemo(() => {
    const offerStatusValues = new Set(Object.values(OfferStatus));
    const invoiceStatusValues = new Set<InvoiceFilterStatus>(["DRAFT", "OPEN", "OVERDUE", "PAID"]);
    return (status: CombinedStatus) => {
      if (offerStatusValues.has(status as OfferStatus)) {
        return formatOfferStatus(status as OfferStatus);
      }
      if (invoiceStatusValues.has(status as InvoiceFilterStatus)) {
        return invoiceStatusLabel(status as InvoiceFilterStatus);
      }
      return String(status);
    };
  }, []);

  const rows = useMemo(() => {
    const today = new Date();
    const invoiceRows: DocumentRow[] =
      mode === "offer"
        ? []
        : invoices.map((invoice) => {
            const statusKey = buildInvoiceStatus(invoice, today);
            return {
              id: invoice.id,
              type: "invoice",
              number: invoice.number,
              clientName: clientNameById.get(invoice.clientId) ?? "Unbekannter Kunde",
              date: invoice.date,
              createdAt: (invoice as { createdAt?: string }).createdAt,
              amountLabel: formatCurrencyEur(
                calculateDocumentTotal(invoice.positions ?? [], Number(invoice.vatRate ?? 0))
              ),
              statusLabel: formatInvoiceStatus(invoice.status, statusKey === "OVERDUE"),
              statusTone: invoiceStatusTone(statusKey),
              statusKey,
              dueDate: invoice.dueDate,
              isOverdue: statusKey === "OVERDUE",
            };
          });

    const offerRows: DocumentRow[] =
      mode === "invoice"
        ? []
        : offers.map((offer) => ({
            id: offer.id,
            type: "offer",
            number: offer.number,
            clientName: clientNameById.get(offer.clientId) ?? "Unbekannter Kunde",
            date: offer.date,
            createdAt: (offer as { createdAt?: string }).createdAt,
            amountLabel: formatCurrencyEur(
              calculateDocumentTotal(offer.positions ?? [], Number(offer.vatRate ?? 0))
            ),
            statusLabel: formatOfferStatus(offer.status),
            statusTone: offerStatusTone(offer.status),
            statusKey: offer.status,
            validUntil: offer.validUntil,
          }));

    return [...offerRows, ...invoiceRows];
  }, [clientNameById, invoices, offers, mode]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aOverdue = a.type === "invoice" && a.isOverdue;
      const bOverdue = b.type === "invoice" && b.isOverdue;

      if (aOverdue !== bOverdue) {
        return aOverdue ? -1 : 1;
      }

      const aInvoiceWithDue = a.type === "invoice" && a.dueDate;
      const bInvoiceWithDue = b.type === "invoice" && b.dueDate;

      if (aInvoiceWithDue && bInvoiceWithDue) {
        const dueDiff =
          (getTimestamp(a.dueDate) ?? 0) - (getTimestamp(b.dueDate) ?? 0);
        if (dueDiff !== 0) return dueDiff;
      } else if (aInvoiceWithDue !== bInvoiceWithDue) {
        return aInvoiceWithDue ? -1 : 1;
      }

      const aOfferWithValidUntil = a.type === "offer" && a.validUntil;
      const bOfferWithValidUntil = b.type === "offer" && b.validUntil;

      if (aOfferWithValidUntil && bOfferWithValidUntil) {
        const validDiff =
          (getTimestamp(a.validUntil) ?? 0) - (getTimestamp(b.validUntil) ?? 0);
        if (validDiff !== 0) return validDiff;
      } else if (aOfferWithValidUntil !== bOfferWithValidUntil) {
        return aOfferWithValidUntil ? -1 : 1;
      }

      const dateDiff = getRowDocumentTimestamp(b) - getRowDocumentTimestamp(a);
      if (dateDiff !== 0) return dateDiff;

      return a.id.localeCompare(b.id);
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    let next = sortedRows;
    if (debouncedSearch) {
      next = next.filter((row) =>
        [row.number, row.clientName].some((value) => value.toLowerCase().includes(debouncedSearch))
      );
    }
    if (selectedStatuses.length) {
      next = next.filter((row) => selectedStatuses.includes(row.statusKey));
    }
    return next;
  }, [sortedRows, debouncedSearch, selectedStatuses]);

  const toggleStatus = (status: CombinedStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Dokumente</h1>
        <p className="text-sm text-gray-600">
          Angebote und Rechnungen in einem Überblick – filtere nach Typ, Status oder Suche.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AppButton
          variant={mode === "all" ? "primary" : "secondary"}
          onClick={() => setMode("all")}
          className="min-w-[120px] justify-center"
        >
          Alle
        </AppButton>
        <AppButton
          variant={mode === "offer" ? "primary" : "secondary"}
          onClick={() => setMode("offer")}
          className="min-w-[120px] justify-center"
        >
          Angebote
        </AppButton>
        <AppButton
          variant={mode === "invoice" ? "primary" : "secondary"}
          onClick={() => setMode("invoice")}
          className="min-w-[120px] justify-center"
        >
          Rechnungen
        </AppButton>
      </div>

      <div className="space-y-3">
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Suche nach Nummer oder Kunde"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                selectedStatuses.includes(status)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300",
              ].join(" ")}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {loading ? (
        <AppCard>
          <div className="text-sm text-gray-500">Lade Dokumente...</div>
        </AppCard>
      ) : filteredRows.length === 0 ? (
        <AppCard>
          <div className="text-sm text-gray-500">Keine Dokumente gefunden.</div>
        </AppCard>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row) => (
            <Link key={`${row.type}-${row.id}`} to={`/app/documents/${row.type}/${row.id}`}>
              <AppCard
                className={[
                  "flex flex-col gap-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition",
                  row.isOverdue ? "border-red-200 bg-red-50/40" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">
                      {row.type === "invoice" ? "Rechnung" : "Angebot"} {row.number}
                    </div>
                    <div className="text-base font-semibold text-gray-900">{row.clientName}</div>
                  </div>
                  <AppBadge color={row.statusTone}>{row.statusLabel}</AppBadge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>{formatDate(row.date, "de-DE")}</span>
                  {row.type === "invoice" && row.dueDate && (
                    <>
                      <span>•</span>
                      <span className={row.isOverdue ? "text-red-600 font-medium" : ""}>
                        Fällig: {formatDate(row.dueDate, "de-DE")}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>{row.amountLabel}</span>
                </div>
              </AppCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
