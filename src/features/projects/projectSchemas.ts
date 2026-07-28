import { z } from "zod";

import { PROJECT_PHASES, PROJECT_PRIORITIES, PROJECT_STATUSES } from "@/domain/projects";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || undefined);
const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Ungültiges Datum")
  .transform((value) => value || undefined);

export const projectCreateSchema = z
  .object({
    customerId: z.uuid().optional(),
    title: z.string().trim().min(1, "Projekttitel fehlt").max(180),
    description: optionalText(5000),
    projectType: optionalText(80),
    source: optionalText(120),
    priority: z.enum(PROJECT_PRIORITIES).default("normal"),
    phase: z.enum(PROJECT_PHASES).default("inquiry"),
    addressLine1: optionalText(240),
    addressLine2: optionalText(240),
    postalCode: optionalText(24),
    city: optionalText(120),
    country: optionalText(120),
    estimatedValue: z.number().finite().min(0).max(100_000_000).optional(),
    startDate: optionalDate,
    targetEndDate: optionalDate,
    assignedUserId: z.uuid().optional(),
  })
  .refine(
    (value) => !value.startDate || !value.targetEndDate || value.targetEndDate >= value.startDate,
    { path: ["targetEndDate"], message: "Das Zielende liegt vor dem Startdatum" },
  );

export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const projectPhaseSchema = z.enum(PROJECT_PHASES);
export const projectPrioritySchema = z.enum(PROJECT_PRIORITIES);
export type ProjectCreateInput = z.input<typeof projectCreateSchema>;
