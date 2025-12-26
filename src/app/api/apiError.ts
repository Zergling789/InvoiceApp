type ApiErrorShape = {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
    retryAfterSeconds?: number;
  };
};

export async function readApiError(res: Response): Promise<{ code?: string; message?: string }> {
  const raw = await res.text().catch(() => "");
  if (!raw) return {};

  try {
    const data = JSON.parse(raw) as ApiErrorShape;
    return {
      code: data?.error?.code,
      message: data?.error?.message ?? raw,
    };
  } catch {
    return { message: raw };
  }
}
