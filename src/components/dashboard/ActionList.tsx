import { Link } from "react-router-dom";

import { AppCard } from "@/ui/AppCard";
import { AppButton } from "@/ui/AppButton";

export type ActionTone = "neutral" | "warning" | "critical";

export interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  amountLabel: string;
  ageLabel: string;
  statusLabel: string;
  tone: ActionTone;
  primaryCta: {
    label: string;
    to: string;
  };
  secondaryCta?: {
    label: string;
    to: string;
  };
}

const toneStyles: Record<ActionTone, string> = {
  neutral: "bg-black/[0.05] text-gray-600 dark:bg-white/10 dark:text-gray-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export function ActionList({
  items,
  isLoading,
  emptyState,
}: {
  items: ActionItem[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}) {
  return (
    <AppCard className="space-y-4 p-2 sm:p-3">
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-3 w-32 rounded bg-gray-100" />
              <div className="flex gap-3">
                <div className="h-8 w-28 rounded bg-gray-200" />
                <div className="h-8 w-20 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        emptyState
      ) : (
        <div className="divide-y divide-[var(--app-border)]">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl p-4 transition-colors hover:bg-black/[0.025] sm:flex-row sm:items-center sm:justify-between dark:hover:bg-white/[0.035]"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-semibold text-[var(--app-text)]">{item.title}</div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneStyles[item.tone]}`}>
                    {item.statusLabel}
                  </span>
                </div>
                <div className="text-sm text-[var(--app-muted)]">{item.subtitle}</div>
                <div className="flex flex-wrap gap-3 text-xs text-[var(--app-muted)]">
                  <span>{item.amountLabel}</span>
                  <span>{item.ageLabel}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={item.primaryCta.to} aria-label={item.primaryCta.label}>
                  <AppButton>{item.primaryCta.label}</AppButton>
                </Link>
                {item.secondaryCta && (
                  <Link to={item.secondaryCta.to} aria-label={item.secondaryCta.label}>
                    <AppButton variant="secondary">{item.secondaryCta.label}</AppButton>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}
