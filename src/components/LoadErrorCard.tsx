import { RefreshCw } from "lucide-react";

import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

type Props = {
  title: string;
  onRetry: () => void;
  retrying?: boolean;
};

export function LoadErrorCard({ title, onRetry, retrying = false }: Props) {
  return (
    <AppCard className="p-6">
      <div role="alert" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-[var(--app-text)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            Prüfe deine Internetverbindung und versuche es erneut. Deine gespeicherten Daten bleiben unverändert.
          </p>
        </div>
        <AppButton type="button" variant="secondary" disabled={retrying} onClick={onRetry}>
          <RefreshCw className={retrying ? "animate-spin" : ""} size={17} aria-hidden="true" />
          {retrying ? "Wird geladen …" : "Erneut versuchen"}
        </AppButton>
      </div>
    </AppCard>
  );
}
