import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { sendBetaFeedback } from "@/app/beta/betaService";
import { AppButton } from "@/ui/AppButton";
import { useToast } from "@/ui/FeedbackProvider";

type BetaFeedbackProps = {
  variant?: "floating" | "menu";
};

export function BetaFeedback({ variant = "floating" }: BetaFeedbackProps) {
  const location = useLocation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<"BUG" | "UNDERSTANDING" | "FEATURE_REQUEST">("BUG");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await sendBetaFeedback({ category, message, route: location.pathname });
      toast.success("Danke für dein Feedback.");
      setMessage("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Feedback konnte nicht gesendet werden.");
    } finally {
      setBusy(false);
    }
  };

  const form = open && (
    <div className={variant === "menu" ? "mt-2 rounded-2xl border border-[var(--app-border)] p-4" : "mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-4 shadow-xl"}>
      <h2 className="font-semibold">Beta-Feedback</h2>
      <p className="mt-1 text-xs text-[var(--app-muted)]">
        Die aktuelle Route wird mitgesendet. Rechnungsinhalte und Screenshots werden nicht automatisch erfasst.
      </p>
      <select className="mt-3 w-full" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
        <option value="BUG">Fehler</option>
        <option value="UNDERSTANDING">Verständnisproblem</option>
        <option value="FEATURE_REQUEST">Funktionswunsch</option>
      </select>
      <textarea className="mt-3 w-full" rows={4} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Was ist passiert oder was fehlt?" />
      <div className="mt-3 flex justify-end gap-2">
        <AppButton variant="ghost" onClick={() => setOpen(false)}>Schließen</AppButton>
        <AppButton disabled={busy || message.trim().length < 3} onClick={() => void submit()}>Senden</AppButton>
      </div>
    </div>
  );

  if (variant === "menu") {
    return (
      <div>
        <button
          type="button"
          className="flex min-h-[44px] w-full items-center gap-2 rounded-full px-4 py-2 text-left text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-black/5 hover:text-[var(--app-text)] dark:hover:bg-white/10"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <MessageSquareText size={16} /> Feedback
        </button>
        {form}
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-4 z-40">
      {form}
      <AppButton variant="secondary" onClick={() => setOpen((value) => !value)}>Feedback</AppButton>
    </div>
  );
}
