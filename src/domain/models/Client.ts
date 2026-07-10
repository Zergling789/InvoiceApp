import type { Client } from "../types";

export function createEmptyClient(id: string): Client {
  return {
    id,
    companyName: "",
    contactPerson: "",
    email: "",
    address: "",
    notes: "",
    country: "Deutschland",
    preferredLanguage: "de",
    preferredDeliveryMethod: "email",
    tags: [],
  };
}

export function normalizeClient(client: Client): Client {
  return {
    ...client,
    companyName: client.companyName ?? "",
    contactPerson: client.contactPerson ?? "",
    email: client.email ?? "",
    address: client.address ?? "",
    notes: client.notes ?? "",
    customerNumber: client.customerNumber ?? "",
    firstName: client.firstName ?? "",
    lastName: client.lastName ?? "",
    jobTitle: client.jobTitle ?? "",
    department: client.department ?? "",
    phone: client.phone ?? "",
    mobile: client.mobile ?? "",
    website: client.website ?? "",
    street: client.street ?? "",
    houseNumber: client.houseNumber ?? "",
    addressAddition: client.addressAddition ?? "",
    postalCode: client.postalCode ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    country: client.country ?? "Deutschland",
    legalForm: client.legalForm ?? "",
    industry: client.industry ?? "",
    vatId: client.vatId ?? "",
    taxNumber: client.taxNumber ?? "",
    registrationNumber: client.registrationNumber ?? "",
    invoiceEmail: client.invoiceEmail ?? "",
    billingAddress: client.billingAddress ?? "",
    paymentTermsDays: client.paymentTermsDays ?? null,
    currency: client.currency ?? "",
    defaultVatRate: client.defaultVatRate ?? null,
    preferredLanguage: client.preferredLanguage ?? "de",
    preferredDeliveryMethod: client.preferredDeliveryMethod ?? "email",
    source: client.source ?? "",
    tags: client.tags ?? [],
    lastContactAt: client.lastContactAt ?? null,
    nextFollowUpAt: client.nextFollowUpAt ?? null,
  };
}
