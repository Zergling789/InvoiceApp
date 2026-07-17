export const DOCUMENT_DRAFT_CONTRACT_VERSION = 1;
export const DOCUMENT_INTAKE_SOURCE_KINDS = Object.freeze([
  "TEXT",
  "VOICE_TRANSCRIPT",
  "PHOTO",
  "BUSINESS_CARD_IMAGE",
  "PDF",
  "REPORT",
]);

const knownSourceKinds = new Set(DOCUMENT_INTAKE_SOURCE_KINDS);

const intakeError = (code, message, status = 400) =>
  Object.assign(new Error(message), { code, status });

export function normalizeDocumentDraftIntake(body) {
  const request = body && typeof body === "object" ? body : {};
  const hasStructuredSource = request.source && typeof request.source === "object";
  const sourceKind = hasStructuredSource ? String(request.source.kind ?? "") : "TEXT";

  if (!knownSourceKinds.has(sourceKind)) {
    throw intakeError("AI_SOURCE_INVALID", "Unbekannte Eingabequelle.");
  }
  if (sourceKind !== "TEXT") {
    throw intakeError(
      "AI_SOURCE_NOT_SUPPORTED",
      "Diese Eingabequelle wird derzeit noch nicht unterstützt.",
      422,
    );
  }

  const rawText = hasStructuredSource ? request.source.text : request.description;
  const description = typeof rawText === "string" ? rawText.trim() : "";
  if (!description) {
    throw intakeError("AI_INPUT_REQUIRED", "Bitte beschreibe die gewünschten Leistungen.");
  }
  if (description.length > 4000) {
    throw intakeError(
      "AI_INPUT_TOO_LONG",
      "Die Beschreibung darf höchstens 4.000 Zeichen enthalten.",
    );
  }

  return {
    sourceKind,
    description,
  };
}
