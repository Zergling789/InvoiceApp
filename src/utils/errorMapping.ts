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
    case "INVOICE_POSITIONS_REQUIRED":
      return "Bitte mindestens eine Position hinzufügen.";
    case "SERVICE_DATE_REQUIRED":
      return "Bitte genau ein Leistungsdatum oder einen vollständigen Leistungszeitraum angeben.";
    case "SERVICE_PERIOD_INVALID":
      return "Der Leistungszeitraum ist ungültig.";
    case "POSITION_TAX_INVALID":
      return "Bitte die Steuerangaben aller Positionen prüfen.";
    case "POSITION_CONTENT_INVALID":
      return "Positionsbeschreibung, Menge und Preis müssen vollständig und dürfen nicht negativ sein.";
    case "TAX_EXEMPTION_REASON_REQUIRED":
      return "Für steuerbefreite Positionen ist ein Rechtsgrund erforderlich.";
    case "SMALL_BUSINESS_TAX_MISMATCH":
      return "Kleinunternehmerregelung und Positionssteuern widersprechen sich.";
    case "UNSUPPORTED_TAX_CASE":
      return "Dieser Steuerfall wird derzeit nicht unterstützt. Reverse Charge und Auslandssachverhalte bitte steuerlich prüfen.";
    case "UNSUPPORTED_MARKET_SCOPE":
      return "Unterstützt werden derzeit nur inländische B2B-Rechnungen deutscher Unternehmen in EUR.";
    case "SELLER_TAX_IDENTIFICATION_REQUIRED":
      return "Bitte hinterlege in den Einstellungen eine Steuernummer oder USt-ID.";
    case "EINVOICE_NOT_FINALIZED":
      return "Nur finalisierte Rechnungen können als E-Rechnung exportiert werden.";
    case "EINVOICE_DATA_INCOMPLETE":
      return "Für diese Rechnung fehlen strukturierte E-Rechnungsdaten.";
    case "EINVOICE_VALIDATION_FAILED":
      return "Die Rechnung hat die E-Rechnungsvalidierung nicht bestanden.";
    case "EINVOICE_GENERATOR_NOT_CONFIGURED":
      return "Der E-Rechnungsdienst ist noch nicht konfiguriert.";
    case "EINVOICE_FORBIDDEN":
      return "Diese E-Rechnung ist nicht verfügbar.";
    case "EINVOICE_GENERATION_TIMEOUT":
    case "EINVOICE_GENERATION_FAILED":
      return "Die E-Rechnung konnte nicht erzeugt werden.";
    case "CII_PREFLIGHT_FAILED":
      return "Die Rechnung enthält noch unvollständige oder nicht unterstützte E-Rechnungsdaten.";
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
