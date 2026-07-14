import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";
import { ApiRequestError } from "@/utils/errors";

export type BillingStatus = { subscription: { plan_key: "BASIS" | "SOLO" | "PRO"; status: string; current_period_end: string | null; cancel_at_period_end: boolean } };

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) { const error = await readApiError(response); throw new ApiRequestError(error.message || "Abrechnungsanfrage fehlgeschlagen.", response.status, error.code); }
  return response.json() as Promise<T>;
}

export const getBillingStatus = () => apiFetch("/api/billing/status", undefined, { auth: true }).then(json<BillingStatus>);
export const createCheckout = (plan: "SOLO" | "PRO", cycle: "monthly" | "yearly") => apiFetch("/api/billing/checkout", { method: "POST", body: JSON.stringify({ plan, cycle }) }, { auth: true }).then(json<{ url: string }>);
export const createBillingPortal = () => apiFetch("/api/billing/portal", { method: "POST" }, { auth: true }).then(json<{ url: string }>);
