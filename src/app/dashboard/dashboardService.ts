import { listClients } from "@/app/clients/clientService";
import { listOffers } from "@/app/offers/offerService";
import { listInvoices } from "@/app/invoices/invoiceService";
import { getRecentProjectActivities, listProjectsPage } from "@/app/projects/projectService";
import { listProjectTasks } from "@/app/tasks/projectTaskService";

export async function loadDashboardData() {
  const [clients, offers, invoices, projectPage, projectActivities, projectTasks] = await Promise.all([
    listClients(),
    listOffers(),
    listInvoices(),
    listProjectsPage({ statuses: ["active"], sort: "attention", pageSize: 6 }),
    getRecentProjectActivities(8),
    listProjectTasks({ statuses: ["open", "in_progress"], limit: 50 }),
  ]);
  return {
    clients,
    offers,
    invoices,
    projects: projectPage.items,
    projectActivities,
    projectTasks,
  };
}
