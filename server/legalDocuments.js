import crypto from "crypto";

export const LEGAL_DOCUMENTS = Object.freeze({
  TERMS: Object.freeze({ version: "2026-07-13", contentId: "terms-2026-07-13" }),
  PRIVACY: Object.freeze({ version: "2026-07-13", contentId: "privacy-2026-07-13" }),
});

export const legalDocumentHash = ({ version, contentId }) =>
  crypto.createHash("sha256").update(`${version}:${contentId}`, "utf8").digest("hex");

export const requiredLegalVersions = () =>
  Object.fromEntries(Object.entries(LEGAL_DOCUMENTS).map(([type, document]) => [type, document.version]));

export const hasCurrentLegalAcceptances = (rows = []) =>
  Object.entries(LEGAL_DOCUMENTS).every(([type, document]) =>
    rows.some((row) => row.document_type === type && row.document_version === document.version)
  );

export const buildLegalAcceptanceRows = ({ userId, requestId, ipHash, userAgent }) =>
  Object.entries(LEGAL_DOCUMENTS).map(([documentType, document]) => ({
    user_id: userId,
    document_type: documentType,
    document_version: document.version,
    document_sha256: legalDocumentHash(document),
    request_id: requestId,
    ip_hash: ipHash || null,
    user_agent: userAgent ? String(userAgent).slice(0, 300) : null,
  }));
