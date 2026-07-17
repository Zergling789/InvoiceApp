import { describe, expect, it } from "vitest";

import {
  DOCUMENT_DRAFT_CONTRACT_VERSION,
  documentIntakeSourceKinds,
  parseAiDocumentDraftResponse,
} from "@/app/ai/documentDraftContract";
import { buildDocumentDraftRequest } from "@/app/ai/aiService";

const validDraft = {
  positions: [{
    title: "Terrasse pflastern",
    description: "Untergrund vorbereiten",
    quantity: 40,
    unit: "m²",
    price: null,
    priceNeedsReview: true,
    category: "Pflasterarbeiten",
    internalNote: "",
    subpositions: [],
    priceSourceId: null,
    taxCategory: "STANDARD" as const,
    taxRate: 19,
    source: null,
  }],
  introText: "",
  footerText: "",
  warnings: ["Preis ergänzen."],
};

describe("document draft contract", () => {
  it("sends a normalized text source to the generic endpoint contract", () => {
    expect(buildDocumentDraftRequest({
      description: "Terrasse pflastern",
      documentType: "offer",
      currency: "EUR",
      vatRate: 19,
      customerId: "customer-1",
    })).toEqual({
      source: { kind: "TEXT", text: "Terrasse pflastern" },
      documentType: "offer",
      currency: "EUR",
      vatRate: 19,
      customerId: "customer-1",
    });
  });

  it("accepts only the current response contract and structured draft", () => {
    expect(parseAiDocumentDraftResponse({
      contractVersion: DOCUMENT_DRAFT_CONTRACT_VERSION,
      draft: validDraft,
    })?.draft).toEqual(validDraft);
    expect(parseAiDocumentDraftResponse({
      contractVersion: 2,
      draft: validDraft,
    })).toBeNull();
    expect(parseAiDocumentDraftResponse({
      contractVersion: DOCUMENT_DRAFT_CONTRACT_VERSION,
      draft: { ...validDraft, positions: [] },
    })).toBeNull();
  });

  it("names all planned intake sources without enabling them in the UI", () => {
    expect(documentIntakeSourceKinds).toEqual([
      "TEXT",
      "VOICE_TRANSCRIPT",
      "PHOTO",
      "BUSINESS_CARD_IMAGE",
      "PDF",
      "REPORT",
    ]);
  });
});
