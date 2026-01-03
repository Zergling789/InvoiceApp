export class ApiRequestError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

type ErrorWithDetails = {
  message?: string;
  details?: string;
  hint?: string;
  error?: {
    message?: string;
  };
};

export const getErrorMessage = (
  error: unknown,
  fallback = "Es ist ein Fehler aufgetreten."
): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error) {
    const details = error as ErrorWithDetails;
    const message = details.message ?? details.error?.message ?? details.details ?? details.hint;
    if (message) return String(message);
  }
  return fallback;
};

export const logError = (error: unknown) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};
