import { memo } from "react";

import type { CreatedDocumentTarget } from "@/features/documents/createdDocumentNavigation";
import type { InvoicePhase, OfferPhase } from "@/features/documents/state/documentState";
import { formatDate } from "@/types";
import { AppBadge } from "@/ui/AppBadge";
import { AppCard } from "@/ui/AppCard";

export type DocumentRow = {
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
  statusKey: OfferPhase | InvoicePhase;
  dueDate?: string;
  validUntil?: string;
  isOverdue?: boolean;
  statusChangedAt?: string;
};

type DocumentResultsProps = {
  rows: DocumentRow[];
  highlightedDocument: CreatedDocumentTarget | null;
  onOpen: (row: DocumentRow) => void;
};

export const DocumentResults = memo(function DocumentResults({
  rows,
  highlightedDocument,
  onOpen,
}: DocumentResultsProps) {
  const isHighlighted = (row: DocumentRow) =>
    highlightedDocument?.id === row.id && highlightedDocument.type === row.type;

  return (
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
            {rows.map((row) => {
              const deadline = row.type === "invoice" ? row.dueDate : row.validUntil;
              return (
                <tr
                  key={`${row.type}-${row.id}`}
                  data-document-key={`${row.type}-${row.id}`}
                  tabIndex={0}
                  onClick={() => onOpen(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(row);
                    }
                  }}
                  className={`cursor-pointer transition-colors hover:bg-[var(--app-primary)]/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--app-primary)] ${row.isOverdue ? "bg-red-500/[0.06]" : ""} ${isHighlighted(row) ? "document-created-highlight" : ""}`}
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
                    {row.statusKey === "accepted" && row.statusChangedAt && (
                      <div className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Angenommen: {formatDate(row.statusChangedAt, "de-DE")}
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
        {rows.map((row) => (
          <button
            key={`${row.type}-${row.id}`}
            data-document-key={`${row.type}-${row.id}`}
            type="button"
            className={`w-full rounded-2xl text-left ${isHighlighted(row) ? "document-created-highlight" : ""}`}
            onClick={() => onOpen(row)}
          >
            <AppCard
              className={[
                "flex flex-col gap-3 transition hover:border-[var(--app-primary)]/40 hover:bg-[var(--app-primary)]/[0.04]",
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
                    <span className={row.isOverdue ? "font-medium text-red-600" : ""}>
                      Fällig: {formatDate(row.dueDate, "de-DE")}
                    </span>
                  </>
                )}
                {row.statusKey === "accepted" && row.statusChangedAt && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      Angenommen: {formatDate(row.statusChangedAt, "de-DE")}
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
  );
});
