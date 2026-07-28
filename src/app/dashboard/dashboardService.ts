import { listClients } from "@/app/clients/clientService";
import { listOffers } from "@/app/offers/offerService";
import { listInvoices } from "@/app/invoices/invoiceService";
import { getRecentProjectActivities, listProjectsPage } from "@/app/projects/projectService";
import { listProjectTasks } from "@/app/tasks/projectTaskService";
import { listProjectAppointments } from "@/app/calendar/projectAppointmentService";

export async function loadDashboardData() {
  const now = new Date();
  const appointmentHorizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [clients, offers, invoices, projectPage, projectActivities, projectTasks, projectAppointments] = await Promise.all([
    listClients(),
    listOffers(),
    listInvoices(),
    listProjectsPage({ statuses: ["active"], sort: "attention", pageSize: 6 }),
    getRecentProjectActivities(8),
    listProjectTasks({ statuses: ["open", "in_progress"], limit: 50 }),
    listProjectAppointments({
      from: now.toISOString(),
      to: appointmentHorizon.toISOString(),
      limit: 8,
    }),
  ]);
  return {
    clients,
    offers,
    invoices,
    projects: projectPage.items,
    projectActivities,
    projectTasks,
    projectAppointments,
  };
}
