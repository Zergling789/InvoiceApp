import type { ReactNode } from "react";
import { AppCard } from "@/ui/AppCard";

type StatCardTone = "default" | "warning" | "critical";

const toneStyles: Record<StatCardTone, string> = {
  default: "",
  warning: "border-amber-500/20",
  critical: "border-red-500/20",
};

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  meta?: string;
  tone?: StatCardTone;
  isLoading?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  meta,
  tone = "default",
  isLoading,
}: StatCardProps) {
  const isSimpleValue = typeof value === "string" || typeof value === "number";
  return (
    <AppCard className={`min-h-44 space-y-3 p-5 sm:p-6 ${toneStyles[tone]}`}>
      <div className="app-eyebrow">{title}</div>
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-8 w-32 rounded bg-gray-200" />
          <div className="h-4 w-40 rounded bg-gray-100" />
        </div>
      ) : (
        <>
          {isSimpleValue ? (
            <div className="text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)] lg:text-4xl">{value}</div>
          ) : (
            <div className="text-[var(--app-text)]">{value}</div>
          )}
          {subtitle && <div className="text-sm text-[var(--app-muted)]">{subtitle}</div>}
          {meta && <div className="text-xs font-medium text-[var(--app-muted)]">{meta}</div>}
        </>
      )}
    </AppCard>
  );
}
