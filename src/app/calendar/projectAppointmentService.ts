import * as repo from "@/data/repositories/projectAppointmentsRepo";
import type { ProjectAppointmentListOptions } from "@/db/projectAppointmentsDb";
import {
  projectAppointmentCreateSchema,
  projectAppointmentUpdateSchema,
  type ProjectAppointmentCreateInput,
  type ProjectAppointmentUpdateInput,
} from "@/features/calendar/projectAppointmentSchemas";

const validateRange = (options: ProjectAppointmentListOptions) => {
  const from = new Date(options.from);
  const to = new Date(options.to);
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    to <= from ||
    to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("Ungültiger Kalenderzeitraum.");
  }
  return options;
};

export const listProjectAppointments = (options: ProjectAppointmentListOptions) =>
  repo.listProjectAppointments(validateRange(options));

export const createProjectAppointment = (
  projectId: string,
  input: ProjectAppointmentCreateInput,
) =>
  repo.createProjectAppointment(
    projectId,
    projectAppointmentCreateSchema.parse(input),
  );

export const updateProjectAppointment = (
  appointmentId: string,
  patch: ProjectAppointmentUpdateInput,
) =>
  repo.updateProjectAppointment(
    appointmentId,
    projectAppointmentUpdateSchema.parse(patch),
  );
