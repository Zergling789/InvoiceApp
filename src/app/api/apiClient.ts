import { requireAccessToken } from "@/lib/auth";

type ApiFetchOptions = {
  auth?: boolean;
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

  return fetch(input, { ...init, headers });
}
