import { useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import ModalSheet from "@/components/ui/ModalSheet";
import InvoiceForm from "@/features/documents/create/InvoiceForm";

export default function InvoiceCreatePage() {
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
    <ModalSheet title="Neue Rechnung" isOpen onClose={handleClose}>
      <InvoiceForm onClose={handleClose} onDirtyChange={setIsDirty} />
    </ModalSheet>
  );
}
