import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import type { Client } from "@/types";
import ProjectForm, { type DraftProject } from "./ProjectForm";

const client: Client = { id: "c-1", companyName: "Müller Gartenbau", contactPerson: "", email: "", address: "", notes: "" };
const initial: DraftProject = { title: "", priority: "normal", country: "Deutschland" };

function TestForm({ onSave = vi.fn(), onCreateClient }: { onSave?: () => void; onCreateClient?: () => void }) {
  const [value, setValue] = useState(initial);
  return <ProjectForm value={value} initialValue={initial} clients={[client]} onChange={setValue} onSave={onSave} onCancel={vi.fn()} onCreateClient={onCreateClient} />;
}

describe("ProjectForm", () => {
  it("guides the user through customer and project information", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TestForm />);
    expect(screen.getByRole("heading", { name: "Kunde zuordnen" })).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Kunde"), "c-1");
    await user.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(screen.getByRole("heading", { name: "Projektinformationen" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Weiter/ })).toBeDisabled();
    await user.type(screen.getByLabelText("Projekttitel"), "Neue Terrasse");
    expect(screen.getByRole("button", { name: /Weiter/ })).toBeEnabled();
  });

  it("allows creating a project without a customer and exposes customer creation", async () => {
    const user = userEvent.setup();
    const onCreateClient = vi.fn();
    renderWithProviders(<TestForm onCreateClient={onCreateClient} />);
    await user.click(screen.getByRole("button", { name: "Neuen Kunden anlegen" }));
    expect(onCreateClient).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /Weiter/ }));
    expect(screen.getByRole("heading", { name: "Projektinformationen" })).toBeVisible();
  });
});

