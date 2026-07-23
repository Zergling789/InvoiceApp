import { z } from "zod";

import {
  PROJECT_PRIORITIES,
  PROJECT_TASK_STATUSES,
} from "@/domain/projects";

const optionalDescription = z
  .string()
  .trim()
  .max(5000, "Die Beschreibung ist zu lang.")
  .optional()
  .transform((value) => value || undefined);

const optionalDateTime = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    "Ungültiges Fälligkeitsdatum.",
  )
  .transform((value) => value || undefined);

const patchDateTime = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine(
    (value) => value == null || value === "" || !Number.isNaN(new Date(value).getTime()),
    "Ungültiges Fälligkeitsdatum.",
  )
  .transform((value) => value || null);

export const projectTaskCreateSchema = z.object({
  title: z.string().trim().min(1, "Aufgabentitel fehlt.").max(240),
  description: optionalDescription,
  priority: z.enum(PROJECT_PRIORITIES).default("normal"),
  dueAt: optionalDateTime,
  assignedUserId: z.uuid().optional(),
});

export const projectTaskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(240).optional(),
    description: optionalDescription,
    status: z.enum(PROJECT_TASK_STATUSES).optional(),
    priority: z.enum(PROJECT_PRIORITIES).optional(),
    dueAt: patchDateTime,
    assignedUserId: z.uuid().nullable().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, "Keine Änderung angegeben.");

export type ProjectTaskCreateInput = z.input<typeof projectTaskCreateSchema>;
export type ProjectTaskUpdateInput = z.input<typeof projectTaskUpdateSchema>;
