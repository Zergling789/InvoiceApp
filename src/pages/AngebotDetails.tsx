import { OfferDetailView } from "@/features/documents/OfferDetailView";
import { OfferStatus, type Client, type Offer } from "@/types";

const demoOffer: Offer = {
  id: "demo-offer",
  number: "AN-0005",
  clientId: "demo-client",
  currency: "EUR",
  date: "2025-12-27",
  validUntil: "2026-01-10",
  positions: [
    { id: "demo-position", description: "Konzeption und Gestaltung", quantity: 10, unit: "Std", price: 95 },
  ],
  vatRate: 19,
  introText: "Gerne unterbreiten wir Ihnen folgendes Angebot:",
  footerText: "Wir freuen uns auf Ihre Rückmeldung.",
  status: OfferStatus.SENT,
};

const demoClient: Client = {
  id: "demo-client",
  companyName: "Zink GmbH",
  contactPerson: "Michelle Zink",
  email: "kontakt@beispiel.de",
  address: "Meisenstraße 12",
  notes: "",
};

export default function AngebotDetails() {
  const net = 950;
  const vat = net * 0.19;
  return (
    <div className="min-h-screen bg-[var(--app-bg)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <OfferDetailView
          offer={demoOffer}
          client={demoClient}
          locale="de-DE"
          currency="EUR"
          statusLabel="Gesendet"
          statusTone="blue"
          totals={{ net, vat, gross: net + vat }}
          timeline={[
            { label: "Erstellt", value: "27.12.2025" },
            { label: "Gesendet", value: "28.12.2025" },
          ]}
          canEdit
          canSend
          canConvert
          onEdit={() => undefined}
          onSend={() => undefined}
          onConvert={() => undefined}
          onMore={() => undefined}
        />
      </div>
    </div>
  );
}
