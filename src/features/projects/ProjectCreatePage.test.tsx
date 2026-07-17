import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import ProjectCreatePage from "@/features/projects/ProjectCreatePage";

const refreshClients = vi.fn();

vi.mock("@/app/clients/clientQueries", () => ({
  useClients: () => ({ clients: [], loading: false, error: "private database detail", refresh: refreshClients }),
}));

describe("ProjectCreatePage", () => {
  it("does not show an unusable project form when customers failed to load", () => {
    renderWithProviders(<ProjectCreatePage />, { route: "/app/projects/new" });

    expect(screen.getByRole("alert")).toHaveTextContent("Kunden konnten nicht geladen werden");
    expect(screen.queryByText("private database detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(refreshClients).toHaveBeenCalledOnce();
  });
});
