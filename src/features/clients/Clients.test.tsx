import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

import Clients from "./Clients";
import { renderWithProviders } from "@/test/renderWithProviders";

let clientsState: {
  clients: Array<Record<string, unknown>>;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  hasMore: boolean;
};
const refreshMock = vi.fn();
const loadMoreMock = vi.fn();

vi.mock("@/app/clients/clientQueries", () => ({
  useClientPages: (search: string) => ({
    ...clientsState,
    clients: search
      ? clientsState.clients.filter((client) =>
          JSON.stringify(client).toLocaleLowerCase("de-DE").includes(search.toLocaleLowerCase("de-DE")),
        )
      : clientsState.clients,
    refresh: refreshMock,
    loadMore: loadMoreMock,
  }),
}));

describe("Clients", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    loadMoreMock.mockReset();
    clientsState = {
      clients: [
        { id: "client-1", companyName: "Acme GmbH", firstName: "Anna", lastName: "Müller", contactPerson: "Anna Müller", email: "anna@acme.de", address: "", notes: "", city: "Berlin" },
        { id: "client-2", companyName: "", firstName: "Peter", lastName: "Schmidt", contactPerson: "Peter Schmidt", email: "", address: "", notes: "", city: "Hamburg" },
      ],
      loading: false,
      loadingMore: false,
      error: null,
      loadMoreError: null,
      hasMore: false,
    };
  });

  it("filters customers by name, company and place", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Clients />, { route: "/app/clients" });
    await user.type(screen.getByLabelText("Kunden durchsuchen"), "hamburg");
    await waitFor(() => expect(screen.queryByText("Acme GmbH")).not.toBeInTheDocument());
    expect(screen.getByText("Peter Schmidt")).toBeInTheDocument();
  });

  it("opens editing on a dedicated route", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Routes><Route path="/app/clients" element={<Clients />} /><Route path="/app/clients/:id/edit" element={<div>Kundenbearbeitung</div>} /></Routes>, { route: "/app/clients" });
    await user.click(screen.getByRole("button", { name: /Acme GmbH/ }));
    expect(screen.getByText("Kundenbearbeitung")).toBeInTheDocument();
  });

  it("shows a useful empty state", () => {
    clientsState.clients = [];
    renderWithProviders(<Clients />, { route: "/app/clients" });
    expect(screen.getByText("Noch keine Kunden")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ersten Kunden anlegen" })).toBeInTheDocument();
  });

  it("offers retry after a loading error", async () => {
    const user = userEvent.setup();
    clientsState.error = "network";
    renderWithProviders(<Clients />, { route: "/app/clients" });
    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes the list after returning from customer creation", async () => {
    renderWithProviders(<Clients />, {
      route: "/app/clients",
      routeState: { refreshDocuments: 123 },
    });

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it("loads another customer page on request", async () => {
    const user = userEvent.setup();
    clientsState.hasMore = true;
    renderWithProviders(<Clients />, { route: "/app/clients" });

    await user.click(screen.getByRole("button", { name: "Weitere Kunden laden" }));
    expect(loadMoreMock).toHaveBeenCalledTimes(1);
  });
});
