import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppButton } from "@/ui/AppButton";
import { trackEvent } from "@/lib/track";

export default function VerifyEmailResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = params.get("token");
  const status = params.get("status");

  useEffect(() => {
    if (!token) return;
    const url = `/api/sender-identities/verify?token=${encodeURIComponent(token)}`;
    window.location.replace(url);
  }, [token]);

  useEffect(() => {
    if (!status) return;
    if (status === "success") {
      trackEvent("sender_identity_verified");
    } else if (status) {
      trackEvent("sender_identity_verify_failed_reason", { reason: status });
    }
  }, [status]);

  if (token) {
    return <div className="text-sm text-gray-600">Verifiziere Adresse...</div>;
  }

  const message = (() => {
    switch (status) {
      case "success":
        return "Adresse verifiziert. Sie koennen jetzt Reply-To fuer Rechnungen nutzen.";
      case "expired":
        return "Link abgelaufen. Bitte einen neuen Bestaetigungslink senden.";
      case "used":
        return "Dieser Link wurde bereits verwendet.";
      case "invalid":
        return "Ungueltiger Link.";
      case "limit":
        return "Limit fuer verifizierte Absenderadressen erreicht.";
      case "error":
        return "Verifizierung fehlgeschlagen. Bitte erneut versuchen.";
      default:
        return "Bitte pruefen Sie Ihren Bestaetigungslink.";
    }
  })();

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-gray-900">E-Mail Verifizierung</h1>
      <p className="text-sm text-gray-600">{message}</p>
      <div className="flex flex-wrap gap-2">        <AppButton variant="secondary" onClick={() => navigate("/app/settings")}>
          Zu den Einstellungen
        </AppButton>
        {(status === "expired" || status === "invalid" || status === "used") && (
          <AppButton onClick={() => navigate("/app/settings")}>Neuen Link senden</AppButton>
        )}
      </div>
    </div>
  );
}
