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

  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const returnUrl = new URLSearchParams(location.search).get("returnUrl");

  const handleClose = (force?: boolean) => {
    if (!force && isDirty && !window.confirm("Änderungen verwerfen?")) return;

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
    <ModalSheet title="Neues Angebot" isOpen onClose={() => handleClose(false)}>
      <OfferForm onClose={handleClose} onDirtyChange={setIsDirty} />
    </ModalSheet>
  );
}
