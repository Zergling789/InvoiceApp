import { useRef } from "react";
import { useLocation, useNavigate, useParams, type Location } from "react-router-dom";

import ModalSheet from "@/components/ui/ModalSheet";
import DocumentDetailPage from "@/features/documents/DocumentDetailPage";

type DocumentDetailRouteProps = {
  forcedType?: "offer" | "invoice";
};

const getFallbackPath = (type?: "offer" | "invoice") => {
  if (type === "invoice") return "/app/invoices";
  if (type === "offer") return "/app/offers";
  return "/app/documents";
};

export default function DocumentDetailRoute({ forcedType }: DocumentDetailRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const refreshTokenRef = useRef<number | null>(null);

  const { type } = useParams<{ type?: "offer" | "invoice" }>();
  const state = location.state as { backgroundLocation?: Location; returnTo?: string } | null;
  const backgroundLocation = state?.backgroundLocation;
  const returnTo = state?.returnTo;
  const resolvedType = forcedType ?? type;

  const handleDocumentsChange = () => {
    refreshTokenRef.current = Date.now();
  };

  const handleClose = () => {
    const refreshDocuments = refreshTokenRef.current;
    refreshTokenRef.current = null;
    const navState = refreshDocuments ? { refreshDocuments } : undefined;

    if (backgroundLocation) {
      navigate(-1, { state: navState });
      return;
    }

    navigate(returnTo ?? getFallbackPath(resolvedType), { state: navState });
  };

  if (!backgroundLocation) {
    return <DocumentDetailPage forcedType={resolvedType} onDocumentsChange={handleDocumentsChange} />;
  }

  return (
    <ModalSheet
      title={resolvedType === "invoice" ? "Rechnung" : "Angebot"}
      isOpen
      onClose={handleClose}
    >
      <DocumentDetailPage forcedType={resolvedType} onDocumentsChange={handleDocumentsChange} />
    </ModalSheet>
  );
}
