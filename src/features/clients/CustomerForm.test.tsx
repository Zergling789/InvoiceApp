import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import CustomerForm from "./CustomerForm";
import { createEmptyClient } from "@/domain/models/Client";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { Client } from "@/types";

function TestForm({ onSave }: { onSave: () => void }) {
  const initial = createEmptyClient("client-new");
  const [value, setValue] = useState<Client>(initial);

  return (
    <CustomerForm
      value={value}
      initialValue={initial}
      onChange={setValue}
      onSave={onSave}
      onCancel={vi.fn()}
      isExisting={false}
      showHeader={false}
    />
  );
}

describe("CustomerForm required fields", () => {
  it("requires first and last name while company remains optional", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderWithProviders(<TestForm onSave={onSave} />);

    expect(screen.getByLabelText("Firma")).not.toBeRequired();
    expect(screen.getByLabelText(/Vorname/)).toBeRequired();
    expect(screen.getByLabelText(/Nachname/)).toBeRequired();
    expect(screen.getByRole("button", { name: "Änderungen speichern" })).toBeDisabled();

    await user.type(screen.getByLabelText(/Vorname/), "Fabian");
    await user.type(screen.getByLabelText(/Nachname/), "Heimlich");
    await user.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
