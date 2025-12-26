import type { SenderIdentity } from "@/types";
import { requireAccessToken } from "@/lib/auth";

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

async function authedFetch(input: RequestInfo, init?: RequestInit) {
  const token = await requireAccessToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

export async function listSenderIdentities(): Promise<SenderIdentity[]> {
  const res = await authedFetch("/api/sender-identities");
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return (data.items ?? []).map(mapSenderIdentity);
}

export async function createSenderIdentity(payload: {
  email: string;
  displayName?: string;
}): Promise<SenderIdentity> {
  const res = await authedFetch("/api/sender-identities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return mapSenderIdentity(data);
}

export async function resendSenderIdentity(id: string): Promise<void> {
  const res = await authedFetch(`/api/sender-identities/${id}/resend`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
}

export async function disableSenderIdentity(id: string): Promise<void> {
  const res = await authedFetch(`/api/sender-identities/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function setDefaultSenderIdentity(senderIdentityId: string | null): Promise<void> {
  const res = await authedFetch("/api/settings/default_sender_identity", {
    method: "PATCH",
    body: JSON.stringify({ senderIdentityId }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function sendTestEmail(senderIdentityId: string): Promise<void> {
  const res = await authedFetch("/api/test-email", {
    method: "POST",
    body: JSON.stringify({ senderIdentityId }),
  });
  if (!res.ok) throw new Error(await res.text());
}
