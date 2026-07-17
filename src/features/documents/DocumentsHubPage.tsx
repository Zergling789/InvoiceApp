import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronDown, ListFilter, Plus } from "lucide-react";

import type { Client, Invoice, Offer, UserSettings } from "@/types";
import { formatDate } from "@/types";
import { calculateDocumentTotal } from "@/utils/dashboard";
import { formatMoney } from "@/utils/money";
import type { CreatedDocumentTarget, DocumentRefreshState } from "@/features/documents/createdDocumentNavigation";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import * as clientService from "@/app/clients/clientService";
import * as offerService from "@/app/offers/offerService";
import * as invoiceService from "@/app/invoices/invoiceService";
import {
  getInvoicePhase,
  getOfferPhase,
  type InvoicePhase,
  type OfferPhase,
} from "@/features/documents/state/documentState";
import {
  formatInvoicePhaseLabel,
  formatOfferPhaseLabel,
} from "@/features/documents/state/formatPhaseLabel";
import { fetchSettings } from "@/app/settings/settingsService";
import { sortDocumentsNewestFirst } from "@/features/documents/sortDocuments";
import { getClientDisplayName, getClientPersonName } from "@/domain/models/Client";

type FilterMode = "all" | "offer" | "invoice";
type CombinedStatus = OfferPhase | InvoicePhase;
const URL_STATUSES = new Set<CombinedStatus>(["draft", "issued", "sent", "overdue", "paid", "canceled", "accepted", "rejected", "invoiced"]);

type DocumentRow = {
  id: string;
  type: "offer" | "invoice";
  number: string;
  clientName: string;
  firstName: string;
  lastName: string;
  companyName: string;
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

const splitPersonName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? "", lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
};

const getClientColumns = (client: Client | undefined, fallbackName = "", fallbackCompany = "") => {
  const personName = client ? getClientPersonName(client) : fallbackName;
  const splitName = splitPersonName(personName);
  const companyName = client?.companyName.trim() || fallbackCompany.trim();
  return {
    firstName: client?.firstName?.trim() || splitName.firstName,
    lastName: client?.lastName?.trim() || splitName.lastName,
    companyName,
    clientName: client ? getClientDisplayName(client) : companyName || personName || "Unbekannter Kunde",
  };
};


const offerStatusTone = (phase: OfferPhase): DocumentRow["statusTone"] => {
  switch (phase) {
    case "accepted":
    case "invoiced":
      return "green";
    case "rejected":
      return "red";
    case "sent":
      return "blue";
    default:
      return "gray";
  }
};

const invoiceStatusTone = (phase: InvoicePhase): DocumentRow["statusTone"] => {
  switch (phase) {
    case "overdue":
      return "red";
    case "paid":
      return "green";
    case "sent":
      return "blue";
    case "issued":
      return "yellow";
    case "canceled":
      return "gray";
    default:
      return "gray";
  }
};

export default function DocumentsHubPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<CombinedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const lastRefreshTokenRef = useRef<number | null>(null);
  const [highlightedDocument, setHighlightedDocument] = useState<CreatedDocumentTarget | null>(null);

  const refreshDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientData, offerData, invoiceData, settingsData] = await Promise.all([
        clientService.list(),
        offerService.listOffers(),
        invoiceService.listInvoices(),
        fetchSettings(),
      ]);
      setClients(clientData);
      setOffers(offerData);
      setInvoices(invoiceData);
      setSettings(settingsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientData, offerData, invoiceData, settingsData] = await Promise.all([
          clientService.list(),
          offerService.listOffers(),
          invoiceService.listInvoices(),
          fetchSettings(),
        ]);
        if (!mounted) return;
        setClients(clientData);
        setOffers(offerData);
        setInvoices(invoiceData);
        setSettings(settingsData);
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
    const navigationState = location.state as DocumentRefreshState | null;
    const refreshToken = navigationState?.refreshDocuments;
    if (!refreshToken || refreshToken === lastRefreshTokenRef.current) return;
    lastRefreshTokenRef.current = refreshToken;
    setHighlightedDocument(navigationState.highlightDocument ?? null);
    void refreshDocuments();
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: {} });
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!highlightedDocument || loading) return;
    const key = `${highlightedDocument.type}-${highlightedDocument.id}`;
    const frame = window.requestAnimationFrame(() => {
      const candidates = document.querySelectorAll<HTMLElement>(`[data-document-key="${key}"]`);
      const visibleCandidate = Array.from(candidates).find((element) => element.offsetParent !== null) ?? candidates[0];
      visibleCandidate?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timeout = window.setTimeout(() => setHighlightedDocument(null), 2600);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [highlightedDocument, loading]);

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
    const requested = (searchParams.get("status") ?? "")
      .split(",")
      .map((status) => status.trim().toLowerCase())
      .filter((status): status is CombinedStatus => URL_STATUSES.has(status as CombinedStatus));
    setSelectedStatuses([...new Set(requested)]);
  }, [searchParams]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setSelectedStatuses([]);
  }, [mode]);

  useEffect(() => {
    if (!newMenuOpen && !statusMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNewMenuOpen(false);
        setStatusMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newMenuOpen, statusMenuOpen]);

  const clientById = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach((client) => map.set(client.id, client));
    return map;
  }, [clients]);

  const statusOptions = useMemo((): CombinedStatus[] => {
    if (mode === "offer") {
      return ["draft", "sent", "accepted", "rejected", "invoiced"];
    }
    if (mode === "invoice") {
      return ["draft", "issued", "sent", "overdue", "paid", "canceled"];
    }
    return [
      "draft",
      "sent",
      "accepted",
      "rejected",
      "invoiced",
      "issued",
      "overdue",
      "paid",
      "canceled",
    ];
  }, [mode]);

  const statusLabel = useMemo(() => {
    const offerPhases = new Set<OfferPhase>(["draft", "sent", "accepted", "rejected", "invoiced"]);
    const invoicePhases = new Set<InvoicePhase>([
      "draft",
      "issued",
      "sent",
      "overdue",
      "paid",
      "canceled",
    ]);
    return (status: CombinedStatus) => {
      if (offerPhases.has(status as OfferPhase)) {
        return formatOfferPhaseLabel(status as OfferPhase);
      }
      if (invoicePhases.has(status as InvoicePhase)) {
        return formatInvoicePhaseLabel(status as InvoicePhase);
      }
      return String(status);
    };
  }, []);

  const rows = useMemo(() => {
    const locale = settings?.locale ?? "de-DE";
    const invoiceCurrency = settings?.currency ?? "EUR";
    const today = new Date();
    const invoiceRows: DocumentRow[] =
      mode === "offer"
        ? []
        : invoices.map((invoice) => {
            const phase = getInvoicePhase(invoice, today);
            const clientColumns = getClientColumns(
              clientById.get(invoice.clientId),
              invoice.clientContactPerson?.trim() || invoice.clientName?.trim() || "",
              invoice.clientCompanyName?.trim() || "",
            );
            return {
              id: invoice.id,
              type: "invoice",
              number: invoice.number ?? "Entwurf",
              ...clientColumns,
              date: invoice.date,
              createdAt: invoice.createdAt,
              amountLabel: formatMoney(
                calculateDocumentTotal(
                  invoice.positions ?? [],
                  Number(invoice.vatRate ?? 0),
                  invoice.isSmallBusiness
                ),
                invoiceCurrency,
                locale
              ),
              statusLabel: formatInvoicePhaseLabel(phase),
              statusTone: invoiceStatusTone(phase),
              statusKey: phase,
              dueDate: invoice.dueDate,
              isOverdue: phase === "overdue",
            };
          });

    const offerRows: DocumentRow[] =
      mode === "invoice"
        ? []
        : offers.map((offer) => {
            const phase = getOfferPhase(offer);
            const currency = offer.currency ?? settings?.currency ?? "EUR";
            const clientColumns = getClientColumns(clientById.get(offer.clientId));
            return {
              id: offer.id,
              type: "offer",
              number: offer.number,
              ...clientColumns,
              date: offer.date,
              createdAt: offer.createdAt,
              amountLabel: formatMoney(
                calculateDocumentTotal(offer.positions ?? [], Number(offer.vatRate ?? 0)),
                currency,
                locale
              ),
              statusLabel: formatOfferPhaseLabel(phase),
              statusTone: offerStatusTone(phase),
              statusKey: phase,
              validUntil: offer.validUntil,
            };
          });

    return [...offerRows, ...invoiceRows];
  }, [clientById, invoices, offers, mode, settings]);

  const sortedRows = useMemo(() => {
    return sortDocumentsNewestFirst(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    let next = sortedRows;
    if (debouncedSearch) {
      next = next.filter((row) =>
        [row.number, row.clientName, row.firstName, row.lastName, row.companyName].some((value) =>
          value.toLowerCase().includes(debouncedSearch),
        )
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

  const openDocument = (row: DocumentRow) => {
    navigate(`/app/${row.type === "invoice" ? "invoices" : "offers"}/${row.id}`, {
      state: {
        backgroundLocation: location,
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const openNewEditor = (type: "invoice" | "offer") => {
    const target = type === "offer" ? "/app/offers/new" : "/app/invoices/new";
    setFabOpen(false);
    setNewMenuOpen(false);
    navigate(target, {
      state: { backgroundLocation: location, returnTo: `${location.pathname}${location.search}` },
    });
  };

  const openNewCustomer = () => {
    setFabOpen(false);
    setNewMenuOpen(false);
    navigate("/app/customers/new", { state: { backgroundLocation: location } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Dokumente</h1>
          <p className="text-sm text-gray-600">
            Angebote und Rechnungen in einem Überblick – filtere nach Typ, Status oder Suche.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <AppButton variant="secondary" onClick={() => void openNewEditor("offer")}>
            Angebot erstellen
          </AppButton>
          <AppButton onClick={() => void openNewEditor("invoice")}>
            Rechnung erstellen
          </AppButton>
        </div>
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
        <div className="flex items-center gap-2">
          <input
            className="min-w-0 flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder="Suche nach Nummer oder Kunde"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className={`relative sm:ml-2 ${statusMenuOpen ? "z-50" : ""}`}>
            <AppButton
              variant="secondary"
              onClick={() => {
                setNewMenuOpen(false);
                setStatusMenuOpen((open) => !open);
              }}
              aria-haspopup="menu"
              aria-expanded={statusMenuOpen}
            >
              <ListFilter size={16} />
              Status
              {selectedStatuses.length > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--app-primary)] px-1.5 text-xs text-white">
                  {selectedStatuses.length}
                </span>
              )}
              <ChevronDown
                size={15}
                className={`transition-transform ${statusMenuOpen ? "rotate-180" : ""}`}
              />
            </AppButton>
            {statusMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onPointerDown={() => setStatusMenuOpen(false)}
                  aria-label="Statusfilter schließen"
                />
                <div
                  role="menu"
                  className="absolute left-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-2 shadow-[var(--app-shadow)] sm:left-auto sm:right-0"
                >
                  <div className="flex items-center justify-between px-3 pb-2 pt-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                      Status filtern
                    </span>
                    {selectedStatuses.length > 0 && (
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--app-primary)] hover:underline"
                        onClick={() => setSelectedStatuses([])}
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>
                  {statusOptions.map((status) => {
                    const selected = selectedStatuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={selected}
                        onClick={() => toggleStatus(status)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <span>{statusLabel(status)}</span>
                        <span className={`grid h-5 w-5 place-items-center rounded-md border ${selected ? "border-[var(--app-primary)] bg-[var(--app-primary)] text-white" : "border-[var(--app-border)]"}`}>
                          {selected && <Check size={14} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <div className="relative hidden sm:ml-2 sm:block">
            <AppButton
              variant="primary"
              className="w-full justify-center sm:w-auto"
              onClick={() => setNewMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={newMenuOpen}
            >
              <Plus size={16} className="mr-2" />
              Neu
            </AppButton>
            {newMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onPointerDown={() => setNewMenuOpen(false)}
                  aria-label="Menü schließen"
                />
                <div className="absolute right-0 mt-2 z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    onClick={() => openNewEditor("invoice")}
                  >
                    Rechnung erstellen
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    onClick={() => openNewEditor("offer")}
                  >
                    Angebot erstellen
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                    onClick={openNewCustomer}
                  >
                    Kunde erstellen
                  </button>
                </div>
              </>
            )}
          </div>
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
        <div>
          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] md:block">
            <table className="w-full min-w-[980px] table-fixed text-left text-sm">
              <thead className="border-b border-[var(--app-border)] bg-black/[0.025] text-xs uppercase tracking-wide text-[var(--app-muted)] dark:bg-white/[0.04]">
                <tr>
                  <th className="w-[17%] px-4 py-3 font-semibold">Dokument</th>
                  <th className="w-[13%] px-4 py-3 font-semibold">Vorname</th>
                  <th className="w-[13%] px-4 py-3 font-semibold">Nachname</th>
                  <th className="w-[16%] px-4 py-3 font-semibold">Firma</th>
                  <th className="w-[18%] px-4 py-3 font-semibold">Datum / Frist</th>
                  <th className="w-[12%] px-4 py-3 text-right font-semibold">Betrag</th>
                  <th className="w-[11%] px-4 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {filteredRows.map((row) => {
                  const deadline = row.type === "invoice" ? row.dueDate : row.validUntil;
                  return (
                    <tr
                      key={`${row.type}-${row.id}`}
                      data-document-key={`${row.type}-${row.id}`}
                      tabIndex={0}
                      onClick={() => openDocument(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDocument(row);
                        }
                      }}
                      className={`cursor-pointer transition-colors hover:bg-[var(--app-primary)]/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--app-primary)] ${row.isOverdue ? "bg-red-500/[0.06]" : ""} ${highlightedDocument?.id === row.id && highlightedDocument.type === row.type ? "document-created-highlight" : ""}`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[var(--app-text)]">{row.number}</div>
                        <div className="mt-1 text-xs text-[var(--app-muted)]">
                          {row.type === "invoice" ? "Rechnung" : "Angebot"}
                        </div>
                      </td>
                      <td className="truncate px-4 py-4" title={row.firstName || undefined}>{row.firstName || "–"}</td>
                      <td className="truncate px-4 py-4" title={row.lastName || undefined}>{row.lastName || "–"}</td>
                      <td className="truncate px-4 py-4" title={row.companyName || undefined}>{row.companyName || "–"}</td>
                      <td className="px-4 py-4">
                        <div>{formatDate(row.date, "de-DE")}</div>
                        {deadline && (
                          <div className={`mt-1 text-xs ${row.isOverdue ? "font-medium text-red-600" : "text-[var(--app-muted)]"}`}>
                            {row.type === "invoice" ? "Fällig" : "Gültig bis"}: {formatDate(deadline, "de-DE")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold tabular-nums">{row.amountLabel}</td>
                      <td className="px-4 py-4 text-right"><AppBadge color={row.statusTone}>{row.statusLabel}</AppBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
          {filteredRows.map((row) => (
            <button
              key={`${row.type}-${row.id}`}
              data-document-key={`${row.type}-${row.id}`}
              type="button"
              className={`w-full rounded-2xl text-left ${highlightedDocument?.id === row.id && highlightedDocument.type === row.type ? "document-created-highlight" : ""}`}
              onClick={() => openDocument(row)}
            >
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
            </button>
          ))}
          </div>
        </div>
      )}

      <div className="mobile-fab sm:hidden">
        <button
          type="button"
          onClick={() => setFabOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200"
          aria-label="Neues Dokument erstellen"
        >
          <span className="text-2xl leading-none">+</span>
        </button>
      </div>

      {fabOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-gray-900/50 sm:hidden"
          onPointerDown={() => setFabOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl bg-white p-6 shadow-xl"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 text-sm font-semibold text-gray-700">Schnell erstellen</div>
            <div className="space-y-3">
              <AppButton className="w-full justify-center" onClick={() => void openNewEditor("invoice")}>
                Neue Rechnung
              </AppButton>
              <AppButton
                variant="secondary"
                className="w-full justify-center"
                onClick={() => void openNewEditor("offer")}
              >
                Neues Angebot
              </AppButton>
              <AppButton
                variant="secondary"
                className="w-full justify-center"
                onClick={openNewCustomer}
              >
                Neuer Kunde
              </AppButton>
              <AppButton variant="ghost" className="w-full justify-center" onClick={() => setFabOpen(false)}>
                Abbrechen
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
