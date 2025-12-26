import { listClients } from "@/app/clients/clientService";
import { listOffers } from "@/app/offers/offerService";
import { listInvoices } from "@/app/invoices/invoiceService";
import { OfferStatus, InvoiceStatus } from "@/types";

export async function loadDashboardKpis() {
  const [clients, offers, invoices] = await Promise.all([listClients(), listOffers(), listInvoices()]);
  const clientCount = clients.length;
  const openOffers = offers.filter((o) => o.status !== OfferStatus.REJECTED && o.status !== OfferStatus.INVOICED).length;
  const openInvoices = invoices.filter((i) => i.status !== InvoiceStatus.PAID).length;
  const today = new Date().getTime();
  const overdueInvoices = invoices.filter(
    (i) => i.status !== InvoiceStatus.PAID && i.dueDate && new Date(i.dueDate).getTime() < today
  ).length;
  return { clientCount, openOffers, openInvoices, overdueInvoices };
}
