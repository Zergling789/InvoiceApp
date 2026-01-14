import React from "react";
import { MoreVertical } from "lucide-react";

type BadgeTone = "gray" | "green" | "blue" | "yellow" | "red";

type DocumentCardProps = {
  variant: "invoice" | "quote";
  documentLabel: string;
  number: string;
  date: string;
  amount: string;
  clientName: string;
  statusLabel: string;
  statusTone: BadgeTone;
  statusDescription?: string;
  metadata?: React.ReactNode;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
  menuActions?: React.ReactNode;
  onClick?: () => void;
};

const badgeStyles: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200",
  green: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  yellow: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  red: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
};

export function DocumentCard({
  variant,
  documentLabel,
  number,
  date,
  amount,
  clientName,
  statusLabel,
  statusTone,
  statusDescription,
  metadata,
  primaryAction,
  secondaryAction,
  menuActions,
  onClick,
}: DocumentCardProps) {
  const variantStyles =
    variant === "quote"
      ? "border-blue-100/80 bg-blue-50/40 dark:border-blue-900/50 dark:bg-slate-900/70"
      : "border-gray-200 dark:border-slate-700 dark:bg-slate-900";

  return (
    <article
      className={[
        "app-card space-y-4",
        variantStyles,
        onClick ? "cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30" : "",
      ].join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {documentLabel}
          </div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">{number}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-slate-400">{date}</div>
          <div className="text-base font-semibold text-gray-800 dark:text-slate-100">{amount}</div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-800 dark:text-slate-200">{clientName}</div>
          <div className="space-y-1">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[statusTone]}`}>
              {statusLabel}
            </span>
            {statusDescription && (
              <div className="text-xs text-gray-500 dark:text-slate-400">{statusDescription}</div>
            )}
          </div>
          {metadata}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <div onClick={(event) => event.stopPropagation()}>{primaryAction}</div>
          {secondaryAction && (
            <div onClick={(event) => event.stopPropagation()}>{secondaryAction}</div>
          )}
        </div>
        {menuActions && (
          <details className="relative" onClick={(event) => event.stopPropagation()}>
            <summary
              className="list-none [&::-webkit-details-marker]:hidden h-11 w-11 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500/60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Weitere Aktionen"
              title="Weitere Aktionen"
            >
              <MoreVertical size={18} />
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="py-1">{menuActions}</div>
            </div>
          </details>
        )}
      </div>
    </article>
  );
}
