export const mapErrorCodeToToast = (code?: string | null) => {
  if (!code) {
    return "Es ist ein unerwarteter Fehler aufgetreten.";
  }

  switch (code) {
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
    case "status_transition_not_allowed":
      return "Statuswechsel ist nicht erlaubt.";
    case "EMAIL_NOT_CONFIGURED":
      return "E-Mail Versand ist nicht konfiguriert.";
    default:
      return "Es ist ein unerwarteter Fehler aufgetreten.";
  }
};
