import { describe, expect, it } from "vitest";

import {
  buildDocumentTimeline,
  canCreateRecipientLink,
} from "@/features/documents/DocumentDetailPage";
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

describe("buildDocumentTimeline", () => {
  it("zeigt den gespeicherten Ablehnungszeitpunkt als Angebotsaktivität", () => {
    const offer = {
      status: OfferStatus.REJECTED,
      date: "2026-07-13",
      validUntil: "2026-07-27",
    } as Offer;

    const timeline = buildDocumentTimeline(offer, [
      {
        id: "activity-rejected",
        event_type: "rejected",
        meta: {},
        created_at: "2026-07-14T12:30:00.000Z",
      },
    ]);

    expect(timeline).toContainEqual({
      label: "Angebot abgelehnt",
      value: "14.7.2026",
    });
  });

  it("erfindet ohne gespeicherte Ablehnungsaktivität kein Datum", () => {
    const offer = {
      status: OfferStatus.REJECTED,
      date: "2026-07-13",
      validUntil: "2026-07-27",
    } as Offer;

    expect(buildDocumentTimeline(offer)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Angebot abgelehnt" }),
      ])
    );
  });
});
