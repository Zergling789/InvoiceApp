import { describe, expect, it } from "vitest";

import { resolveOfferWorkflowErrorCode } from "@/app/offers/offerService";
import { mapErrorCodeToToast } from "@/utils/errorMapping";

describe("offer workflow errors", () => {
  it("extracts stable business codes from Postgres exception messages", () => {
    expect(resolveOfferWorkflowErrorCode({
      code: "P0001",
      message: "OFFER_NOT_ACCEPTED",
    })).toBe("OFFER_NOT_ACCEPTED");
  });

  it("shows a clear message for duplicate conversions", () => {
    expect(mapErrorCodeToToast("OFFER_ALREADY_CONVERTED")).toBe(
      "Für dieses Angebot wurde bereits eine Rechnung erstellt.",
    );
  });
});
