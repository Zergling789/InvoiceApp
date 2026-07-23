import { z } from "zod";

import { PROJECT_APPOINTMENT_TYPES } from "@/domain/projects";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);

const dateTime = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Ungültiger Zeitpunkt.");

const appointmentFields = {
  title: z.string().trim().min(1, "Termintitel fehlt.").max(240),
  startsAt: dateTime,
  endsAt: dateTime,
  appointmentType: z.enum(PROJECT_APPOINTMENT_TYPES),
  location: optionalText(500),
  note: optionalText(5000),
};

const validatePeriod = (value: { startsAt?: string; endsAt?: string }) => {
  if (!value.startsAt || !value.endsAt) return true;
  const startsAt = new Date(value.startsAt).getTime();
  const endsAt = new Date(value.endsAt).getTime();
  return endsAt > startsAt && endsAt - startsAt <= 31 * 24 * 60 * 60 * 1000;
};

export const projectAppointmentCreateSchema = z
  .object(appointmentFields)
  .refine(validatePeriod, {
    path: ["endsAt"],
    message: "Das Terminende muss nach dem Beginn liegen.",
  });

export const projectAppointmentUpdateSchema = z
  .object({
    title: appointmentFields.title.optional(),
    startsAt: appointmentFields.startsAt.optional(),
    endsAt: appointmentFields.endsAt.optional(),
    appointmentType: appointmentFields.appointmentType.optional(),
    location: appointmentFields.location,
    note: appointmentFields.note,
  })
  .refine((patch) => Object.keys(patch).length > 0, "Keine Änderung angegeben.")
  .refine(validatePeriod, {
    path: ["endsAt"],
    message: "Das Terminende muss nach dem Beginn liegen.",
  });

export type ProjectAppointmentCreateInput = z.input<typeof projectAppointmentCreateSchema>;
export type ProjectAppointmentUpdateInput = z.input<typeof projectAppointmentUpdateSchema>;
