import {
  dbCreateProjectAppointment,
  dbListProjectAppointments,
  dbUpdateProjectAppointment,
  type ProjectAppointmentListOptions,
} from "@/db/projectAppointmentsDb";

export const listProjectAppointments = (options: ProjectAppointmentListOptions) =>
  dbListProjectAppointments(options);
export const createProjectAppointment = (
  projectId: string,
  input: Record<string, unknown>,
) => dbCreateProjectAppointment(projectId, input);
export const updateProjectAppointment = (
  appointmentId: string,
  patch: Record<string, unknown>,
) => dbUpdateProjectAppointment(appointmentId, patch);
