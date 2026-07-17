import { describe, expect, it, vi } from "vitest";

import { sendDocumentEmail, shouldRetryEmailSend } from "@/app/email/emailService";

const payload = {
  documentId: "invoice-1",
  documentType: "invoice" as const,
  to: "kunde@example.de",
  subject: "Rechnung RE-2026-001",
  message: "Guten Tag",
  senderIdentityId: "sender-1",
};

const jsonResponse = (status: number, code: string, message = "Versand fehlgeschlagen") =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("email service delivery safety", () => {
  it("retries only a PDF engine reset, never a generic 503", async () => {
    expect(shouldRetryEmailSend(503, "EMAIL_SEND_FAILED")).toBe(false);
    expect(shouldRetryEmailSend(503, "PDF_ENGINE_RESET")).toBe(true);

    const apiFetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(503, "EMAIL_SEND_FAILED"),
    );

    await expect(
      sendDocumentEmail(payload, { apiFetchImpl, delayImpl: vi.fn() }),
    ).rejects.toMatchObject({ code: "EMAIL_SEND_FAILED" });
    expect(apiFetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a reset before SMTP delivery once", async () => {
    const apiFetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, "PDF_ENGINE_RESET"))
      .mockResolvedValueOnce(jsonResponse(200, "OK"));
    const delayImpl = vi.fn().mockResolvedValue(undefined);

    await expect(
      sendDocumentEmail(payload, { apiFetchImpl, delayImpl }),
    ).resolves.toEqual({ ok: true });
    expect(apiFetchImpl).toHaveBeenCalledTimes(2);
    expect(delayImpl).toHaveBeenCalledWith(500);
  });

  it("reports an aborted request as an unknown delivery state", async () => {
    const apiFetchImpl = vi.fn(
      (_input: RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    await expect(
      sendDocumentEmail(payload, { apiFetchImpl, timeoutMs: 1 }),
    ).rejects.toMatchObject({ code: "EMAIL_SEND_STATUS_UNKNOWN" });
    expect(apiFetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports a browser network failure as an unknown delivery state", async () => {
    const apiFetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      sendDocumentEmail(payload, { apiFetchImpl }),
    ).rejects.toMatchObject({ code: "EMAIL_SEND_STATUS_UNKNOWN" });
    expect(apiFetchImpl).toHaveBeenCalledTimes(1);
  });
});
