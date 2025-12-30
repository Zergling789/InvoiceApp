import { Link } from "react-router-dom";
import { AppButton } from "@/ui/AppButton";
import { DocumentsList } from "@/features/documents/DocumentsList";

export default function DocumentsPage({ type }: { type: "offer" | "invoice" }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Link to="/app/offers" className="w-full sm:w-auto">
          <AppButton variant={type === "offer" ? "primary" : "secondary"} className="w-full sm:w-auto justify-center">
            Angebote
          </AppButton>
        </Link>
        <Link to="/app/invoices" className="w-full sm:w-auto">
          <AppButton variant={type === "invoice" ? "primary" : "secondary"} className="w-full sm:w-auto justify-center">
            Rechnungen
          </AppButton>
        </Link>
      </div>

      <DocumentsList type={type} />
    </div>
  );
}
