type ApiErrorShape = {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    retryAfterSeconds?: number;
  };
};

export async function readApiError(
  res: Response
): Promise<{ code?: string; message?: string; requestId?: string }> {
  const requestIdHeader = res.headers.get("x-request-id") ?? undefined;
  const raw = await res.text().catch(() => "");
  if (!raw) {
    return { message: "Unerwartete Serverantwort.", requestId: requestIdHeader };
  }
  try {
    const data = JSON.parse(raw) as ApiErrorShape;
    const message = data?.error?.message ?? "Unerwarteter Serverfehler.";
    return {
      code: data?.error?.code,
      message,
      requestId: data?.error?.requestId ?? requestIdHeader,
    };
  } catch {
    return { message: "Unerwartete Serverantwort.", requestId: requestIdHeader };
  }
}
