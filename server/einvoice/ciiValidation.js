import { validateCanonicalInvoice } from "./canonicalValidation.js";

export class CiiValidationError extends Error {
  constructor(issues) {
    super("CII_PREFLIGHT_FAILED");
    this.name = "CiiValidationError";
    this.code = "CII_PREFLIGHT_FAILED";
    this.status = 422;
    this.issues = issues;
  }
}

export function validateCanonicalInvoiceForCii(invoice) {
  return validateCanonicalInvoice(invoice);
}

export function assertCanonicalInvoiceForCii(invoice) {
  const issues = validateCanonicalInvoiceForCii(invoice);
  if (issues.length) throw new CiiValidationError(issues);
}
