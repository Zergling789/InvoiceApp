export const CLIENT_ERROR_EVENT = "freelanceflow:client-error";

export type ClientErrorKind =
  | "REACT_RENDER_ERROR"
  | "UNHANDLED_ERROR"
  | "UNHANDLED_REJECTION";

export type ClientErrorEventDetail = {
  errorId: string;
};

type ReportOptions = {
  errorId?: string;
  notify?: boolean;
};

let globalReportingInstalled = false;
let lastGlobalReportAt = 0;
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_SEGMENT = /^[A-Za-z0-9_-]{25,}$/;

function isAbortFailure(reason: unknown): boolean {
  if (reason instanceof DOMException) return reason.name === "AbortError";
  return reason instanceof Error && reason.name === "AbortError";
}

function createErrorId(): string {
  return crypto.randomUUID();
}

function safeClientRoute(pathname: string): string {
  const segments = pathname.split("/");
  return segments
    .map((segment, index) => {
      if (!segment) return segment;
      if (segments[index - 1] === "recipient") return ":token";
      if (UUID_SEGMENT.test(segment) || OPAQUE_SEGMENT.test(segment)) return ":id";
      return segment;
    })
    .join("/");
}

export function reportClientError(kind: ClientErrorKind, options: ReportOptions = {}): string {
  const errorId = options.errorId ?? createErrorId();

  if (options.notify !== false) {
    window.dispatchEvent(
      new CustomEvent<ClientErrorEventDetail>(CLIENT_ERROR_EVENT, {
        detail: { errorId },
      }),
    );
  }

  try {
    void fetch("/api/client-errors", {
      method: "POST",
      credentials: "omit",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        errorId,
        kind,
        route: safeClientRoute(window.location.pathname),
      }),
    }).catch(() => undefined);
  } catch {
    // Reporting must never cause another user-facing failure.
  }

  return errorId;
}

export function initializeGlobalBrowserErrorReporting(): void {
  if (globalReportingInstalled) return;
  globalReportingInstalled = true;

  const reportGlobalFailure = (kind: Exclude<ClientErrorKind, "REACT_RENDER_ERROR">, reason: unknown) => {
    if (isAbortFailure(reason)) return;

    const now = Date.now();
    if (now - lastGlobalReportAt < 1000) return;
    lastGlobalReportAt = now;
    reportClientError(kind);
  };

  window.addEventListener("error", (event) => {
    reportGlobalFailure("UNHANDLED_ERROR", event.error);
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportGlobalFailure("UNHANDLED_REJECTION", event.reason);
  });
}
