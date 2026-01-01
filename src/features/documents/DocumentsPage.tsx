import { DocumentsList } from "@/features/documents/DocumentsList";

export default function DocumentsPage({ type }: { type: "offer" | "invoice" }) {
  return (
    <div className="space-y-4">
      <DocumentsList type={type} />
    </div>
  );
}
