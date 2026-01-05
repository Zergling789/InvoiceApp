import { useRef, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import ModalSheet from "@/components/ui/ModalSheet";
import InvoiceForm from "@/features/documents/create/InvoiceForm";

export default function InvoiceCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDirty, setIsDirty] = useState(false);
  const skipConfirmRef = useRef(false);
  const refreshTokenRef = useRef<number | null>(null);

  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const returnUrl = new URLSearchParams(location.search).get("returnUrl");

  const handleClose = ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
    const shouldSkipConfirm = skipConfirm || skipConfirmRef.current;
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
      navigate(`${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`, {
        replace: true,
        state: buildState(backgroundLocation.state),
      });
      return;
    }

    if (returnUrl) {
      navigate(returnUrl, { replace: true, state: buildState(undefined) });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app", { state: buildState(undefined) });
    }
  };

  return (
    <ModalSheet title="Neue Rechnung" isOpen onClose={handleClose}>
      <InvoiceForm
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
