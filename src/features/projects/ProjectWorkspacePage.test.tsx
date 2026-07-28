import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import ProjectWorkspacePage from "./ProjectWorkspacePage";

vi.mock("@/app/email/documentDeliveryService", () => ({
  listProjectDeliveries: vi.fn().mockResolvedValue([]),
}));

vi.mock("./ProjectDetailPage", () => ({
  default: () => <div>Projektdetails</div>,
}));

describe("ProjectWorkspacePage", () => {
  it("links the central project actions to the current project", () => {
    renderWithProviders(
      <Routes>
        <Route path="/app/projects/:projectId" element={<ProjectWorkspacePage />} />
      </Routes>,
      { route: "/app/projects/project-42" },
    );

    expect(screen.getByRole("heading", { name: "Schnellaktionen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Angebot erstellen" })).toHaveAttribute(
      "href",
      expect.stringContaining("projectId=project-42"),
    );
    expect(screen.getByRole("link", { name: "Rechnung erstellen" })).toHaveAttribute(
      "href",
      expect.stringContaining("projectId=project-42"),
    );
    expect(screen.getByRole("link", { name: "Aufgabe anlegen" })).toHaveAttribute(
      "href",
      "/app/projects/project-42?tab=aufgaben&action=new",
    );
    expect(screen.getByRole("link", { name: "Termin anlegen" })).toHaveAttribute(
      "href",
      "/app/projects/project-42?tab=termine&action=new",
    );
    expect(screen.getByText("Projektdetails")).toBeInTheDocument();
  });
});