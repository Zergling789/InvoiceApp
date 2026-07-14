import { useState } from "react";
import { useLocation } from "react-router-dom";
import { sendBetaFeedback } from "@/app/beta/betaService";
import { AppButton } from "@/ui/AppButton";
import { useToast } from "@/ui/FeedbackProvider";

export function BetaFeedback() {
  const location = useLocation(); const toast = useToast(); const [open, setOpen] = useState(false); const [category, setCategory] = useState<"BUG" | "UNDERSTANDING" | "FEATURE_REQUEST">("BUG"); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); try { await sendBetaFeedback({ category, message, route: location.pathname }); toast.success("Danke für dein Feedback."); setMessage(""); setOpen(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Feedback konnte nicht gesendet werden."); } finally { setBusy(false); } };
  return <div className="fixed bottom-20 right-4 z-40 md:bottom-5">{open && <div className="mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-4 shadow-xl"><h2 className="font-semibold">Beta-Feedback</h2><p className="mt-1 text-xs text-[var(--app-muted)]">Die aktuelle Route wird mitgesendet. Rechnungsinhalte und Screenshots werden nicht automatisch erfasst.</p><select className="mt-3 w-full" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="BUG">Fehler</option><option value="UNDERSTANDING">Verständnisproblem</option><option value="FEATURE_REQUEST">Funktionswunsch</option></select><textarea className="mt-3 w-full" rows={4} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Was ist passiert oder was fehlt?"/><div className="mt-3 flex justify-end gap-2"><AppButton variant="ghost" onClick={() => setOpen(false)}>Schließen</AppButton><AppButton disabled={busy || message.trim().length < 3} onClick={() => void submit()}>Senden</AppButton></div></div>}<AppButton variant="secondary" onClick={() => setOpen((value) => !value)}>Feedback</AppButton></div>;
}
