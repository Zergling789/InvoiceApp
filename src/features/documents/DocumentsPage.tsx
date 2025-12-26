import { Link } from "react-router-dom";
import { AppButton } from "@/ui/AppButton";
import { DocumentsList } from "@/features/documents/DocumentsList";

export default function DocumentsPage({ type }: { type: "offer" | "invoice" }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Link to="/app/offers">
          <AppButton variant={type === "offer" ? "primary" : "secondary"}>Angebote</AppButton>
        </Link>
        <Link to="/app/invoices">
          <AppButton variant={type === "invoice" ? "primary" : "secondary"}>Rechnungen</AppButton>
        </Link>
      </div>

      <DocumentsList type={type} />
    </div>
  );
}
