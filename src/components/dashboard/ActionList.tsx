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
  secondaryCta: {
    label: string;
    to: string;
  };
}

const toneStyles: Record<ActionTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-700",
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
    <AppCard className="space-y-4">
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
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-semibold text-gray-900">{item.title}</div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneStyles[item.tone]}`}>
                    {item.statusLabel}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{item.subtitle}</div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{item.amountLabel}</span>
                  <span>{item.ageLabel}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={item.primaryCta.to} aria-label={item.primaryCta.label}>
                  <AppButton>{item.primaryCta.label}</AppButton>
                </Link>
                <Link to={item.secondaryCta.to} aria-label={item.secondaryCta.label}>
                  <AppButton variant="secondary">{item.secondaryCta.label}</AppButton>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}
