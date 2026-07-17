import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

import CustomerEditPage from "./CustomerEditPage";
import { renderWithProviders } from "@/test/renderWithProviders";

const getMock = vi.fn();
const saveMock = vi.fn();
const removeMock = vi.fn();

vi.mock("@/app/clients/clientService", () => ({ get: (...args: unknown[]) => getMock(...args), saveClient: (...args: unknown[]) => saveMock(...args), removeClient: (...args: unknown[]) => removeMock(...args) }));

describe("CustomerEditPage", () => {
  beforeEach(() => {
    getMock.mockReset(); saveMock.mockReset(); removeMock.mockReset();
    getMock.mockResolvedValue({ id: "client-1", companyName: "Acme GmbH", firstName: "Anna", lastName: "Müller", contactPerson: "Anna Müller", email: "", address: "", notes: "" });
  });

  it("loads and saves the customer on its own page", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Routes><Route path="/app/clients/:id/edit" element={<CustomerEditPage />} /><Route path="/app/clients" element={<div>Kundenübersicht</div>} /></Routes>, { route: "/app/clients/client-1/edit" });
    expect(await screen.findByDisplayValue("Anna")).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Vorname/));
    await user.type(screen.getByLabelText(/Vorname/), "Anja");
    await user.click(screen.getByRole("button", { name: "Änderungen speichern" }));
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ firstName: "Anja", contactPerson: "Anja Müller" })));
    expect(screen.getByText("Kundenübersicht")).toBeInTheDocument();
  });

  it("provides a way back when loading fails", async () => {
    getMock.mockRejectedValue(new Error("network"));
    renderWithProviders(<Routes><Route path="/app/clients/:id/edit" element={<CustomerEditPage />} /></Routes>, { route: "/app/clients/client-1/edit" });
    expect(await screen.findByText("Kunde konnte nicht geöffnet werden")).toBeInTheDocument();
  });
});
