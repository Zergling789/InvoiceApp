import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  requireAccessToken: requireAccessTokenMock,
}));

import { API_SESSION_EXPIRED_EVENT } from "@/app/api/apiEvents";
import { apiFetch, readJsonResponse } from "@/app/api/apiClient";

describe("api fetch resilience", () => {
  beforeEach(() => {
    requireAccessTokenMock.mockResolvedValue("access-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("notifies the app when an authenticated request returns 401", async () => {
    const listener = vi.fn();
    window.addEventListener(API_SESSION_EXPIRED_EVENT, listener);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {
      status: 401,
      headers: { "x-request-id": "request-1" },
    })));

    const response = await apiFetch("/api/private", undefined, { auth: true });

    expect(response.status).toBe(401);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/private", expect.objectContaining({
      headers: expect.any(Headers),
      signal: expect.any(AbortSignal),
    }));
    window.removeEventListener(API_SESSION_EXPIRED_EVENT, listener);
  });

  it("aborts a request after the configured timeout", async () => {
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      })));

    await expect(apiFetch("/api/slow", undefined, { timeoutMs: 1 })).rejects.toMatchObject({
      code: "NETWORK_TIMEOUT",
      status: 408,
    });
  });

  it("turns an offline fetch failure into a stable German error", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiFetch("/api/unreachable")).rejects.toMatchObject({
      code: "OFFLINE",
      message: expect.stringContaining("Keine Internetverbindung"),
    });
  });

  it("does not expose an invalid response body in errors", async () => {
    const response = new Response("private upstream response", {
      status: 502,
      headers: { "content-type": "text/html", "x-request-id": "request-2" },
    });

    await expect(readJsonResponse(response)).rejects.toMatchObject({
      code: "INVALID_SERVER_RESPONSE",
      requestId: "request-2",
      message: "Die Serverantwort konnte nicht verarbeitet werden.",
    });
    await expect(
      readJsonResponse(new Response("{not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      })),
    ).rejects.not.toThrow("not-json");
  });
});
