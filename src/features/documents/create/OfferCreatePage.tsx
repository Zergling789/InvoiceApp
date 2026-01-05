import { useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import ModalSheet from "@/components/ui/ModalSheet";
import OfferForm from "@/features/documents/create/OfferForm";

export default function OfferCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDirty, setIsDirty] = useState(false);

  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const returnUrl = new URLSearchParams(location.search).get("returnUrl");

  const handleClose = () => {
    if (isDirty && !window.confirm("Änderungen verwerfen?")) return;

    if (backgroundLocation) {
      navigate(`${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`, { replace: true });
      return;
    }

    if (returnUrl) {
      navigate(returnUrl, { replace: true });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app");
    }
  };

  return (
    <ModalSheet title="Neues Angebot" isOpen onClose={handleClose}>
      <OfferForm onClose={handleClose} onDirtyChange={setIsDirty} />
    </ModalSheet>
  );
}
