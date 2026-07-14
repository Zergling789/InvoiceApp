import crypto from "crypto";

export const LEGAL_DOCUMENTS = Object.freeze({
  TERMS: Object.freeze({ version: "2026-07-14", content: "FreelanceFlow Nutzungsbedingungen 2026-07-14: Marktumfang, Prüfpflicht, keine Steuer- oder Rechtsberatung, Webhook-basierte Tarifrechte." }),
  PRIVACY: Object.freeze({ version: "2026-07-14", content: "FreelanceFlow Datenschutzerklärung 2026-07-14: Konto-, Unternehmens-, Kunden-, Dokument- und Betriebsdaten; Betroffenenrechte; Unterauftragnehmer; Aufbewahrung extern zu prüfen." }),
});

export const legalDocumentHash = ({ version, content }) =>
  crypto.createHash("sha256").update(`${version}\n${content}`, "utf8").digest("hex");

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
