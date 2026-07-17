import { requireAccessToken } from "@/lib/auth";
import { notifySessionExpired } from "@/app/api/apiEvents";
import { ApiRequestError } from "@/utils/errors";

type ApiFetchOptions = {
  auth?: boolean;
  timeoutMs?: number;
};

const DEFAULT_API_TIMEOUT_MS = 60_000;

// VITE_API_PROXY configures only Vite's development proxy (vite.config.ts).
// Browser requests must remain same-origin in development so Vite can proxy /api.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const resolveApiUrl = (input: RequestInfo): RequestInfo => {
  if (typeof input !== "string") {
    return input;
  }

  if (!API_BASE_URL || /^https?:\/\//i.test(input)) {
    return input;
  }

  const base = API_BASE_URL.replace(/\/$/, "");
  const path = input.startsWith("/") ? input : `/${input}`;
  return `${base}${path}`;
};

export async function apiFetch(input: RequestInfo, init?: RequestInit, opts?: ApiFetchOptions) {
  const headers = new Headers(init?.headers ?? {});

  if (opts?.auth) {
    let token: string;
    try {
      token = await requireAccessToken();
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "NOT_AUTHENTICATED") {
        notifySessionExpired();
      }
      throw error;
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  let timedOut = false;
  const handleExternalAbort = () => controller.abort(init?.signal?.reason);
  if (init?.signal?.aborted) handleExternalAbort();
  else init?.signal?.addEventListener("abort", handleExternalAbort, { once: true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts?.timeoutMs ?? DEFAULT_API_TIMEOUT_MS);

  try {
    const response = await fetch(resolveApiUrl(input), {
      ...init,
      headers,
      signal: controller.signal,
    });
    if (opts?.auth && response.status === 401) {
      notifySessionExpired({ requestId: response.headers.get("x-request-id") ?? undefined });
    }
    return response;
  } catch (error) {
    if (timedOut) {
      throw new ApiRequestError(
        "Der Server antwortet nicht rechtzeitig. Bitte prüfe den Status der Aktion, bevor du sie erneut ausführst.",
        408,
        "NETWORK_TIMEOUT",
      );
    }
    if (error instanceof TypeError) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      throw new ApiRequestError(
        offline
          ? "Keine Internetverbindung. Bitte versuche es erneut, sobald du wieder online bist."
          : "Der Server ist derzeit nicht erreichbar. Bitte prüfe deine Verbindung und versuche es erneut.",
        0,
        offline ? "OFFLINE" : "NETWORK_UNAVAILABLE",
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", handleExternalAbort);
  }
}

export async function readJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "unknown";
  const raw = await res.text().catch(() => "");
  const requestId = res.headers.get("x-request-id") ?? undefined;

  if (!contentType.includes("application/json")) {
    throw new ApiRequestError(
      "Die Serverantwort konnte nicht verarbeitet werden.",
      res.status,
      "INVALID_SERVER_RESPONSE",
      requestId,
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiRequestError(
      "Die Serverantwort konnte nicht verarbeitet werden.",
      res.status,
      "INVALID_SERVER_RESPONSE",
      requestId,
    );
  }
}
