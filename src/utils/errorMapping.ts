const normalizeErrorCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

export const mapErrorCodeToToast = (code?: string | null) => {
  if (!code) {
    return undefined;
  }

  const normalized = normalizeErrorCode(code);

  switch (normalized) {
    case "NOT_AUTHENTICATED":
      return "Bitte melde dich erneut an.";
    case "FORBIDDEN":
      return "Keine Berechtigung für diese Aktion.";
    case "INVOICE_LOCKED_CONTENT":
      return "Diese Rechnung ist finalisiert und kann nicht geändert werden.";
    case "INVOICE_LOCK_INVALID_STATUS":
      return "Rechnungsstatus erlaubt kein Sperren.";
    case "INVOICE_NUMBER_IMMUTABLE":
      return "Die Rechnungsnummer kann nach der Finalisierung nicht geändert werden.";
    case "STATUS_TRANSITION_NOT_ALLOWED":
      return "Statuswechsel ist nicht erlaubt.";
    case "EMAIL_NOT_CONFIGURED":
      return "E-Mail Versand ist nicht konfiguriert.";
    case "CLIENT_REQUIRED":
    case "CLIENT_NAME_REQUIRED":
    case "CLIENT_SNAPSHOT_MISSING":
      return "Bitte Kunde auswählen.";
    case "POSITIONS_REQUIRED":
      return "Bitte mindestens eine Position hinzufügen.";
    case "UNIQUE_VIOLATION":
      return "Ein Eintrag mit diesen Daten existiert bereits.";
    case "FOREIGN_KEY_VIOLATION":
      return "Verknüpfte Daten fehlen oder sind ungültig.";
    case "INVALID_INPUT":
    case "CHECK_VIOLATION":
      return "Ungültige Eingabe.";
    case "PDF_ENGINE_RESET":
      return "PDF-Engine wurde neu gestartet. Bitte erneut senden.";
    case "PDF_GENERATION_FAILED":
      return "PDF konnte nicht erstellt werden.";
    case "IDEMPOTENCY_IN_PROGRESS":
      return "Die Anfrage wird bereits verarbeitet.";
    case "IDEMPOTENCY_KEY_REUSED":
      return "Die Anfrage wurde bereits verarbeitet.";
    default:
      return undefined;
  }
};

export const formatErrorToast = ({
  code,
  message,
  requestId,
  fallback = "Es ist ein unerwarteter Fehler aufgetreten.",
}: {
  code?: string | null;
  message?: string | null;
  requestId?: string | null;
  fallback?: string;
}) => {
  const baseMessage = mapErrorCodeToToast(code) ?? message ?? fallback;
  if (!requestId) return baseMessage;
  return `${baseMessage} Fehler-ID: ${requestId}`;
};
