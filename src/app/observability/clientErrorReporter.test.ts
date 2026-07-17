import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLIENT_ERROR_EVENT,
  reportClientError,
  type ClientErrorEventDetail,
} from "@/app/observability/clientErrorReporter";

describe("client error reporter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends only a correlation id, kind and pathname", async () => {
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 202 }));
    window.history.replaceState({}, "", "/recipient/private-token?secret=value");

    const errorId = "41968d9d-d552-4a6b-8f84-ae5c97a98b34";
    reportClientError("UNHANDLED_ERROR", { errorId, notify: false });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/client-errors",
      expect.objectContaining({ method: "POST", credentials: "omit", keepalive: true }),
    );
    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      errorId,
      kind: "UNHANDLED_ERROR",
      route: "/recipient/:token",
    });
  });

  it("emits a safe notice without exposing an error object", () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 202 }));
    const listener = vi.fn<(event: Event) => void>();
    window.addEventListener(CLIENT_ERROR_EVENT, listener);

    const errorId = reportClientError("UNHANDLED_REJECTION");

    const event = listener.mock.calls[0]?.[0] as CustomEvent<ClientErrorEventDetail>;
    expect(event.detail).toEqual({ errorId });
    window.removeEventListener(CLIENT_ERROR_EVENT, listener);
  });
});
