import type { SenderIdentity } from "@/types";
import { readApiError } from "@/app/api/apiError";
import { apiFetch } from "@/app/api/apiClient";

type SenderIdentityRow = {
  id: string;
  email: string;
  display_name?: string | null;
  status: "pending" | "verified" | "disabled";
  verified_at?: string | null;
  last_verification_sent_at?: string | null;
};

function mapSenderIdentity(row: SenderIdentityRow): SenderIdentity {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? null,
    status: row.status,
    verifiedAt: row.verified_at ?? null,
    lastVerificationSentAt: row.last_verification_sent_at ?? null,
  };
}

export async function listSenderIdentities(): Promise<SenderIdentity[]> {
  const res = await apiFetch("/api/sender-identities", undefined, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    throw new Error(err.message || "Request failed.");
  }
  const data = await res.json();
  return (data.items ?? []).map(mapSenderIdentity);
}

export async function createSenderIdentity(payload: {
  email: string;
  displayName?: string;
}): Promise<SenderIdentity> {
  const res = await apiFetch("/api/sender-identities", {
    method: "POST",
    body: JSON.stringify(payload),
  }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    throw new Error(err.message || "Request failed.");
  }
  const data = await res.json();
  return mapSenderIdentity(data);
}

export async function resendSenderIdentity(id: string): Promise<void> {
  const res = await apiFetch(`/api/sender-identities/${id}/resend`, { method: "POST" }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    throw new Error(err.message || "Request failed.");
  }
}

export async function disableSenderIdentity(id: string): Promise<void> {
  const res = await apiFetch(`/api/sender-identities/${id}`, { method: "DELETE" }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    throw new Error(err.message || "Request failed.");
  }
}

export async function setDefaultSenderIdentity(senderIdentityId: string | null): Promise<void> {
  const res = await apiFetch("/api/settings/default_sender_identity", {
    method: "PATCH",
    body: JSON.stringify({ senderIdentityId }),
  }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    throw new Error(err.message || "Request failed.");
  }
}

export async function sendTestEmail(senderIdentityId: string): Promise<void> {
  const res = await apiFetch("/api/test-email", {
    method: "POST",
    body: JSON.stringify({ senderIdentityId }),
  }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    throw new Error(err.message || "Request failed.");
  }
}
