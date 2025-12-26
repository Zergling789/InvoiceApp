import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";

import Clients from "./Clients";
import { ConfirmProvider, ToastProvider } from "@/ui/FeedbackProvider";

let removeMock: ReturnType<typeof vi.fn>;
let refreshMock: ReturnType<typeof vi.fn>;

vi.mock("@/app/clients/clientQueries", () => ({
  useClients: () => ({
    clients: [
      {
        id: "client-1",
        companyName: "Acme GmbH",
        contactPerson: "",
        email: "test@example.com",
        address: "",
        notes: "",
      },
    ],
    loading: false,
    error: null,
    refresh: refreshMock,
  }),
  useDeleteClient: () => ({ remove: removeMock, deleting: false }),
  useSaveClient: () => ({ save: vi.fn(), saving: false }),
}));

describe("Clients delete flow", () => {
  beforeEach(() => {
    removeMock = vi.fn();
    refreshMock = vi.fn();
  });

  it("shows dialog and cancels without deleting", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ConfirmProvider>
          <Clients />
        </ConfirmProvider>
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /loeschen|l?schen/i }));
    expect(screen.getByText("Kunde loeschen")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(removeMock).not.toHaveBeenCalled();
  });

  it("confirms and deletes", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ConfirmProvider>
          <Clients />
        </ConfirmProvider>
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /loeschen|l?schen/i }));
    expect(screen.getByText("Kunde loeschen")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bestaetigen" }));

    expect(removeMock).toHaveBeenCalledWith("client-1");
  });
});
