import { requireAccessToken } from "@/lib/auth";

type ApiFetchOptions = {
  auth?: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ?? import.meta.env.VITE_API_PROXY
  ?? "";

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
    const token = await requireAccessToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(resolveApiUrl(input), { ...init, headers });
}

export async function readJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "unknown";
  const raw = await res.text().catch(() => "");
  const preview = raw.trim().slice(0, 200);

  if (!contentType.includes("application/json")) {
    const message = preview
      ? `Unexpected response format. Expected JSON. Status: ${res.status}. Content-Type: ${contentType}. Body starts with: ${preview}`
      : `Unexpected response format. Expected JSON. Status: ${res.status}. Content-Type: ${contentType}.`;
    throw new Error(message);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    const message = preview
      ? `Failed to parse JSON response. Status: ${res.status}. Content-Type: ${contentType}. Body starts with: ${preview}`
      : `Failed to parse JSON response. Status: ${res.status}. Content-Type: ${contentType}.`;
    throw new Error(message);
  }
}
