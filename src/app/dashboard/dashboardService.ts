import { listClients } from "@/app/clients/clientService";
import { listOffers } from "@/app/offers/offerService";
import { listInvoices } from "@/app/invoices/invoiceService";

export async function loadDashboardData() {
  const [clients, offers, invoices] = await Promise.all([listClients(), listOffers(), listInvoices()]);
  return { clients, offers, invoices };
}
