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

  it("bietet als Kundenstandard nur App-Standard oder EUR an", () => {
    renderWithProviders(<TestForm onSave={vi.fn()} />);

    const currencySelect = screen.getByLabelText("Währung") as HTMLSelectElement;
    expect(Array.from(currencySelect.options, (option) => option.value)).toEqual(["", "EUR"]);
  });

  it("zeigt zuerst nur die wichtigsten Kontaktdaten", () => {
    renderWithProviders(<TestForm onSave={vi.fn()} />);

    expect(screen.getByLabelText(/Vorname/)).toBeVisible();
    expect(screen.getByLabelText(/Nachname/)).toBeVisible();
    expect(screen.getByLabelText("Firma")).toBeVisible();
    expect(screen.getByLabelText("E-Mail")).toBeVisible();
    expect(screen.getByLabelText("Telefon")).toBeVisible();
    expect(screen.getByLabelText("Kundennummer")).not.toBeVisible();
    expect(screen.getByText("Weitere Kontaktdaten")).toBeVisible();
  });

  it("begrenzt Steuerstandard und Sprache auf unterstützte Werte", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TestForm onSave={vi.fn()} />);

    await user.click(screen.getByText("Abrechnung"));

    const vatSelect = screen.getByLabelText("Standard-MwSt.") as HTMLSelectElement;
    const languageSelect = screen.getByLabelText("Sprache") as HTMLSelectElement;
    expect(Array.from(vatSelect.options, (option) => option.value)).toEqual(["", "19", "7"]);
    expect(Array.from(languageSelect.options, (option) => option.value)).toEqual(["de"]);
  });
});
