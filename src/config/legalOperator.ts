export type LegalOperatorConfig = {
  legalName: string; ownerOrRepresentative: string; street: string; postalCode: string; city: string; country: string;
  email: string; phone?: string; vatId?: string; registrationCourt?: string; registrationNumber?: string;
  privacyEmail: string; supportEmail: string;
};

export const legalOperator: LegalOperatorConfig = {
  legalName: import.meta.env.VITE_LEGAL_NAME ?? "",
  ownerOrRepresentative: import.meta.env.VITE_LEGAL_REPRESENTATIVE ?? "",
  street: import.meta.env.VITE_LEGAL_STREET ?? "",
  postalCode: import.meta.env.VITE_LEGAL_POSTAL_CODE ?? "",
  city: import.meta.env.VITE_LEGAL_CITY ?? "",
  country: import.meta.env.VITE_LEGAL_COUNTRY ?? "Deutschland",
  email: import.meta.env.VITE_LEGAL_EMAIL ?? "",
  phone: import.meta.env.VITE_LEGAL_PHONE || undefined,
  vatId: import.meta.env.VITE_LEGAL_VAT_ID || undefined,
  registrationCourt: import.meta.env.VITE_LEGAL_REGISTRATION_COURT || undefined,
  registrationNumber: import.meta.env.VITE_LEGAL_REGISTRATION_NUMBER || undefined,
  privacyEmail: import.meta.env.VITE_LEGAL_PRIVACY_EMAIL ?? "",
  supportEmail: import.meta.env.VITE_LEGAL_SUPPORT_EMAIL ?? "",
};

export const legalOperatorConfigured = [legalOperator.legalName, legalOperator.ownerOrRepresentative, legalOperator.street, legalOperator.postalCode, legalOperator.city, legalOperator.email, legalOperator.privacyEmail, legalOperator.supportEmail].every((value) => value.trim().length > 0);
