import { describe, expect, it } from "vitest";

import { canCreateRecipientLink } from "@/features/documents/DocumentDetailPage";
import { OfferStatus, type Offer } from "@/types";

describe("canCreateRecipientLink", () => {
  it("bleibt während des initialen Ladens ohne Dokument sicher", () => {
    expect(canCreateRecipientLink(null, "offer")).toBe(false);
    expect(canCreateRecipientLink(null, "invoice")).toBe(false);
  });

  it("erlaubt Empfängerlinks für gesendete Angebote", () => {
    const offer = { status: OfferStatus.SENT } as Offer;

    expect(canCreateRecipientLink(offer, "offer")).toBe(true);
  });
});
