import type { Client, Invoice, Offer, UserSettings } from "@/types";
import { InvoiceStatus } from "@/types";
import { isOverdue } from "@/domain/rules/invoiceRules";

type SendWarningContext = {
  documentType: "offer" | "invoice";
  document: Offer | Invoice;
  client: Client | undefined;
  settings: UserSettings;
  invoices?: Invoice[];
};

export function getSendWarnings({
  documentType,
  document,
  client,
  settings,
  invoices = [],
}: SendWarningContext): string[] {
  const warnings: string[] = [];

  if (!settings.iban?.trim()) {
    warnings.push("IBAN fehlt in den Einstellungen.");
  }

  if (documentType === "offer") {
    const offer = document as Offer;
    if (offer.validUntil) {
      const expiresAt = new Date(offer.validUntil);
      const diffDays = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);
      if (diffDays >= 0 && diffDays <= 3) {
        warnings.push("Angebot läuft bald ab.");
      }
    }
  }

  if (client?.id) {
    const hasOverdue = invoices.some(
      (inv) =>
        inv.clientId === client.id &&
        inv.status !== InvoiceStatus.PAID &&
        isOverdue({ status: inv.status, dueDate: inv.dueDate })
    );
    if (hasOverdue) {
      warnings.push("Kunde hat überfällige Rechnungen.");
    }
  }

  return warnings;
}
