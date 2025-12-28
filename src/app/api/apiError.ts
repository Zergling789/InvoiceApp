type ApiErrorShape = {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
    retryAfterSeconds?: number;
  };
};

export async function readApiError(res: Response): Promise<{ code?: string; message?: string }> {
  const contentType = res.headers.get("content-type") ?? "unknown";
  const raw = await res.text().catch(() => "");
  const preview = raw.trim().slice(0, 200);
  const baseMessage = `Request failed. Status: ${res.status}. Content-Type: ${contentType}.`;

  if (!raw) return { message: baseMessage };

  try {
    const data = JSON.parse(raw) as ApiErrorShape;
    const message = data?.error?.message ?? preview;
    return {
      code: data?.error?.code,
      message: message ? `${baseMessage} ${message}` : baseMessage,
    };
  } catch {
    return { message: preview ? `${baseMessage} Body starts with: ${preview}` : baseMessage };
  }
}
