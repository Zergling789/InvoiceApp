import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import type { Client } from "@/types";
import ProjectForm, { type DraftProject } from "./ProjectForm";

const client: Client = { id: "c-1", companyName: "Müller Gartenbau", contactPerson: "", email: "", address: "", notes: "" };
const initial: DraftProject = { name: "", clientId: "", budgetType: "hourly", hourlyRate: 0, budgetTotal: 0, status: "active" };

function TestForm() {
  const [value, setValue] = useState(initial);
  return <ProjectForm value={value} initialValue={initial} clients={[client]} onChange={setValue} onSave={vi.fn()} onCancel={vi.fn()} showHeader={false} />;
}

function EmptyClientForm({ onCreateClient }: { onCreateClient: () => void }) {
  const [value, setValue] = useState(initial);
  return <ProjectForm value={value} initialValue={initial} clients={[]} onChange={setValue} onSave={vi.fn()} onCancel={vi.fn()} onCreateClient={onCreateClient} showHeader={false} />;
}

describe("ProjectForm", () => {
  it("shows only fields relevant to the selected billing type", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TestForm />);

    expect(screen.getByLabelText(/^Stundensatz/)).toBeVisible();
    expect(screen.getByLabelText(/^Geplante Stunden/)).toBeVisible();
    expect(screen.queryByLabelText(/^Vereinbarter Festpreis/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Festpreis/));
    expect(screen.getByLabelText(/^Vereinbarter Festpreis/)).toBeVisible();
    expect(screen.queryByLabelText(/^Stundensatz/)).not.toBeInTheDocument();
  });

  it("enables saving only after project and customer are selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TestForm />);
    const saveButton = screen.getByRole("button", { name: "Projekt anlegen" });
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Projektname/), "Neue Terrasse");
    await user.selectOptions(screen.getByLabelText(/Kunde/), "c-1");
    expect(saveButton).toBeEnabled();
  });

  it("offers a direct next step when no customer exists", async () => {
    const user = userEvent.setup();
    const onCreateClient = vi.fn();
    renderWithProviders(<EmptyClientForm onCreateClient={onCreateClient} />);
    await user.click(screen.getByRole("button", { name: "Kunden anlegen" }));
    expect(onCreateClient).toHaveBeenCalledOnce();
  });
});
