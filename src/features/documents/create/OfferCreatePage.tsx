import { useRef, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import ModalSheet from "@/components/ui/ModalSheet";
import OfferForm from "@/features/documents/create/OfferForm";

export default function OfferCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDirty, setIsDirty] = useState(false);
  const skipConfirmRef = useRef(false);
  const refreshTokenRef = useRef<number | null>(null);

  const state = location.state as { backgroundLocation?: Location; returnTo?: string } | null;
  const backgroundLocation = state?.backgroundLocation;
  const returnTo = state?.returnTo;
  const returnUrl = new URLSearchParams(location.search).get("returnUrl");

  const handleClose = (force?: boolean) => {
    const shouldSkipConfirm = force || skipConfirmRef.current;
    if (!shouldSkipConfirm && isDirty && !window.confirm("Änderungen verwerfen?")) return;

    skipConfirmRef.current = false;
    const refreshDocuments = refreshTokenRef.current;
    refreshTokenRef.current = null;

    const buildState = (targetState?: unknown) => {
      if (!refreshDocuments) return targetState;
      return {
        ...(targetState && typeof targetState === "object" ? (targetState as Record<string, unknown>) : {}),
        refreshDocuments,
      };
    };

    if (backgroundLocation) {
      navigate(-1, { state: buildState(undefined) });
      return;
    }

    if (returnTo) {
      navigate(returnTo, { replace: true, state: buildState(undefined) });
      return;
    }

    if (returnUrl) {
      navigate(returnUrl, { replace: true, state: buildState(undefined) });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app/offers", { state: buildState(undefined) });
    }
  };

  return (
    <ModalSheet title="Neues Angebot" isOpen onClose={() => handleClose(false)}>
      <OfferForm
        onClose={handleClose}
        onDirtyChange={setIsDirty}
        onSaved={() => {
          skipConfirmRef.current = true;
          refreshTokenRef.current = Date.now();
          setIsDirty(false);
        }}
      />
    </ModalSheet>
  );
}
