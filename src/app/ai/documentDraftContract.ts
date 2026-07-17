export const DOCUMENT_DRAFT_CONTRACT_VERSION = 1 as const;
export const DOCUMENT_DRAFT_TEXT_LIMIT = 4000;

export const documentIntakeSourceKinds = [
  "TEXT",
  "VOICE_TRANSCRIPT",
  "PHOTO",
  "BUSINESS_CARD_IMAGE",
  "PDF",
  "REPORT",
] as const;

export type DocumentIntakeSourceKind = (typeof documentIntakeSourceKinds)[number];

export type TextDocumentIntakeSource = {
  kind: "TEXT";
  text: string;
};

type AiDraftSource = {
  id: string;
  title: string;
  kind: string;
  source: string;
  productNumber?: string | null;
  manufacturer?: string | null;
  imageUrl?: string | null;
};

export type AiDraftPosition = {
  title: string;
  description: string;
  quantity: number;
  unit: string;
  price: number | null;
  priceNeedsReview: boolean;
  category: string;
  internalNote: string;
  subpositions: string[];
  priceSourceId: string | null;
  taxCategory: "STANDARD" | "REDUCED" | "ZERO" | "EXEMPT" | "SMALL_BUSINESS" | "REVERSE_CHARGE";
  taxRate: number;
  source: AiDraftSource | null;
};

export type AiDocumentDraft = {
  positions: AiDraftPosition[];
  introText: string;
  footerText: string;
  warnings: string[];
};

export type AiDocumentDraftResponse = {
  contractVersion: typeof DOCUMENT_DRAFT_CONTRACT_VERSION;
  draft: AiDocumentDraft;
};

const taxCategories = new Set<AiDraftPosition["taxCategory"]>([
  "STANDARD",
  "REDUCED",
  "ZERO",
  "EXEMPT",
  "SMALL_BUSINESS",
  "REVERSE_CHARGE",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBoundedString = (value: unknown, min: number, max: number): value is string =>
  typeof value === "string" && value.length >= min && value.length <= max;

const isOptionalNullableString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string";

const isDraftSource = (value: unknown): value is AiDraftSource => {
  if (!isRecord(value)) return false;
  return isBoundedString(value.id, 1, 500)
    && isBoundedString(value.title, 1, 500)
    && isBoundedString(value.kind, 1, 100)
    && isBoundedString(value.source, 1, 500)
    && isOptionalNullableString(value.productNumber)
    && isOptionalNullableString(value.manufacturer)
    && isOptionalNullableString(value.imageUrl);
};

const isDraftPosition = (value: unknown): value is AiDraftPosition => {
  if (!isRecord(value)) return false;
  const subpositions = value.subpositions;
  const price = value.price;
  return isBoundedString(value.title, 1, 200)
    && isBoundedString(value.description, 0, 2000)
    && typeof value.quantity === "number"
    && Number.isFinite(value.quantity)
    && value.quantity > 0
    && isBoundedString(value.unit, 1, 30)
    && (price === null || (typeof price === "number" && Number.isFinite(price) && price >= 0))
    && typeof value.priceNeedsReview === "boolean"
    && isBoundedString(value.category, 0, 100)
    && isBoundedString(value.internalNote, 0, 1000)
    && Array.isArray(subpositions)
    && subpositions.length <= 12
    && subpositions.every((entry) => isBoundedString(entry, 1, 300))
    && (value.priceSourceId === null || isBoundedString(value.priceSourceId, 1, 200))
    && typeof value.taxCategory === "string"
    && taxCategories.has(value.taxCategory as AiDraftPosition["taxCategory"])
    && typeof value.taxRate === "number"
    && Number.isFinite(value.taxRate)
    && (value.source === null || isDraftSource(value.source));
};

export const parseAiDocumentDraftResponse = (value: unknown): AiDocumentDraftResponse | null => {
  if (!isRecord(value) || value.contractVersion !== DOCUMENT_DRAFT_CONTRACT_VERSION) return null;
  const draft = value.draft;
  if (!isRecord(draft)) return null;
  const positions = draft.positions;
  const warnings = draft.warnings;
  if (!Array.isArray(positions) || positions.length < 1 || positions.length > 20) return null;
  if (!positions.every(isDraftPosition)) return null;
  if (!isBoundedString(draft.introText, 0, 1000)) return null;
  if (!isBoundedString(draft.footerText, 0, 1000)) return null;
  if (!Array.isArray(warnings) || warnings.length > 10) return null;
  if (!warnings.every((entry) => isBoundedString(entry, 1, 500))) return null;

  return value as AiDocumentDraftResponse;
};
