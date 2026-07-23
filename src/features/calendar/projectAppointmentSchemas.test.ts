import { describe, expect, it } from "vitest";

import {
  projectAppointmentCreateSchema,
  projectAppointmentUpdateSchema,
} from "./projectAppointmentSchemas";

describe("project appointment schemas", () => {
  it("normalizes a valid appointment", () => {
    expect(
      projectAppointmentCreateSchema.parse({
        title: "  Besichtigung vor Ort  ",
        startsAt: "2026-08-01T08:00:00.000Z",
        endsAt: "2026-08-01T09:00:00.000Z",
        appointmentType: "site_visit",
        location: "",
        note: "",
      }),
    ).toEqual({
      title: "Besichtigung vor Ort",
      startsAt: "2026-08-01T08:00:00.000Z",
      endsAt: "2026-08-01T09:00:00.000Z",
      appointmentType: "site_visit",
      location: null,
      note: null,
    });
  });

  it("rejects invalid appointment periods", () => {
    expect(() =>
      projectAppointmentCreateSchema.parse({
        title: "Falscher Termin",
        startsAt: "2026-08-01T10:00:00.000Z",
        endsAt: "2026-08-01T09:00:00.000Z",
        appointmentType: "other",
      }),
    ).toThrow();
  });

  it("rejects arbitrary appointment types", () => {
    expect(() =>
      projectAppointmentUpdateSchema.parse({
        appointmentType: "customer_lunch",
      }),
    ).toThrow();
  });
});
