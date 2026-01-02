import React from "react";

type StatusTone = "gray" | "green" | "blue" | "red" | "yellow";

type DocumentCardProps = {
  typeLabel: string;
  number: string;
  dateLabel: string;
  amountLabel: string;
  clientName: string;
  statusLabel: string;
  statusTone: StatusTone;
  statusNote?: string;
  actions: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
  accent?: "neutral" | "brand";
};

const statusToneStyles: Record<StatusTone, string> = {
  gray: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200",
  green: "bg-green-100 text-green-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-amber-500/20 dark:text-amber-200",
  red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200",
};

export function DocumentCard({
  typeLabel,
  number,
  dateLabel,
  amountLabel,
  clientName,
  statusLabel,
  statusTone,
  statusNote,
  actions,
  menu,
  className = "",
  accent = "neutral",
}: DocumentCardProps) {
  const accentClasses =
    accent === "brand"
      ? "border-blue-200 bg-blue-50/50 dark:border-blue-500/40 dark:bg-slate-900"
      : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900";

  return (
    <div className={`rounded-xl border shadow-sm p-4 space-y-4 ${accentClasses} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {typeLabel}
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">{number}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-slate-400">{dateLabel}</div>
          <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">{amountLabel}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700 dark:text-slate-200">{clientName}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusToneStyles[statusTone]}`}
          >
            {statusLabel}
          </span>
          {statusNote && <span className="text-xs text-gray-500 dark:text-slate-400">{statusNote}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
        {menu}
      </div>
    </div>
  );
}
