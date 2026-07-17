const SMTP_TIMEOUT_CODES = new Set(["ETIMEDOUT", "ESOCKET", "ECONNECTION"]);

export const classifyEmailDeliveryError = (error, mailAccepted = false) => {
  if (mailAccepted) {
    return {
      status: 502,
      code: "EMAIL_SENT_STATUS_UPDATE_FAILED",
      message:
        "Die E-Mail wurde vom Mailserver angenommen, aber der Versand konnte in FreelanceFlow nicht vollständig abgeschlossen werden. Bitte nicht erneut senden und den Status prüfen.",
    };
  }

  const code = String(error?.code ?? "").toUpperCase();
  const responseCode = Number(error?.responseCode ?? 0);

  if (SMTP_TIMEOUT_CODES.has(code)) {
    return {
      status: 504,
      code: "EMAIL_SEND_STATUS_UNKNOWN",
      message:
        "Der Mailserver hat nicht rechtzeitig geantwortet. Der Versandstatus ist unklar. Bitte nicht sofort erneut senden.",
    };
  }

  if (code === "EAUTH") {
    return {
      status: 503,
      code: "EMAIL_PROVIDER_AUTH_FAILED",
      message: "Die Absenderverbindung konnte nicht authentifiziert werden.",
    };
  }

  if (code === "EENVELOPE" || (responseCode >= 500 && responseCode < 600)) {
    return {
      status: 422,
      code: "EMAIL_RECIPIENT_REJECTED",
      message: "Der Mailserver hat mindestens eine Empfängeradresse abgelehnt.",
    };
  }

  return null;
};
