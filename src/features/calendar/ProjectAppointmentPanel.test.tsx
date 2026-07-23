import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import * as appointmentService from "@/app/calendar/projectAppointmentService";
import type { ProjectAppointment } from "@/domain/projects";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ProjectAppointmentPanel } from "./ProjectAppointmentPanel";

vi.mock("@/app/calendar/projectAppointmentService", () => ({
  createProjectAppointment: vi.fn(),
  updateProjectAppointment: vi.fn(),
}));

const appointment: ProjectAppointment = {
  id: "appointment-1",
  organizationId: "org-1",
  projectId: "project-1",
  customerId: "client-1",
  title: "Besichtigung vor Ort",
  startsAt: "2026-08-01T08:00:00.000Z",
  endsAt: "2026-08-01T09:00:00.000Z",
  appointmentType: "site_visit",
  location: "Musterstraße 1",
  note: null,
  createdBy: "user-1",
  createdAt: "2026-07-23T10:00:00.000Z",
  updatedAt: "2026-07-23T10:00:00.000Z",
};

describe("ProjectAppointmentPanel", () => {
  it("creates a project appointment", async () => {
    const user = userEvent.setup();
    const onAppointmentsChange = vi.fn();
    const onActivitiesChange = vi.fn().mockResolvedValue(undefined);
    vi.mocked(appointmentService.createProjectAppointment).mockResolvedValue(
      appointment,
    );

    renderWithProviders(
      <ProjectAppointmentPanel
        projectId="project-1"
        appointments={[]}
        defaultType="site_visit"
        onAppointmentsChange={onAppointmentsChange}
        onActivitiesChange={onActivitiesChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Termin erstellen" }));
    await user.type(screen.getByLabelText("Titel"), "Besichtigung vor Ort");
    await user.click(screen.getByRole("button", { name: "Termin anlegen" }));

    expect(appointmentService.createProjectAppointment).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        title: "Besichtigung vor Ort",
        appointmentType: "site_visit",
      }),
    );
    expect(onAppointmentsChange).toHaveBeenCalledWith([appointment]);
    expect(onActivitiesChange).toHaveBeenCalledOnce();
  });

  it("opens an existing appointment for editing", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ProjectAppointmentPanel
        projectId="project-1"
        appointments={[appointment]}
        onAppointmentsChange={vi.fn()}
        onActivitiesChange={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Besichtigung vor Ort bearbeiten" }),
    );

    expect(screen.getByRole("heading", { name: "Termin bearbeiten" })).toBeVisible();
    expect(screen.getByLabelText("Titel")).toHaveValue("Besichtigung vor Ort");
    expect(screen.getByLabelText("Ort")).toHaveValue("Musterstraße 1");
  });
});
