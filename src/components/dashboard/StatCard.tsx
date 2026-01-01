import { AppCard } from "@/ui/AppCard";

type StatCardTone = "default" | "warning" | "critical";

const toneStyles: Record<StatCardTone, string> = {
  default: "border-gray-200",
  warning: "border-amber-200 bg-amber-50/40",
  critical: "border-red-200 bg-red-50/40",
};

interface StatCardProps {
  title: string;
  value: string;
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
  return (
    <AppCard className={`space-y-2 border ${toneStyles[tone]}`}>
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-8 w-32 rounded bg-gray-200" />
          <div className="h-4 w-40 rounded bg-gray-100" />
        </div>
      ) : (
        <>
          <div className="text-3xl font-semibold text-gray-900">{value}</div>
          {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
          {meta && <div className="text-xs text-gray-500">{meta}</div>}
        </>
      )}
    </AppCard>
  );
}
