import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PositionSuggestionInput } from "./PositionSuggestionInput";

const service = vi.hoisted(() => ({
  findPositionSuggestions: vi.fn(),
  recordPositionSuggestionEvent: vi.fn(async () => undefined),
}));

vi.mock("@/app/positions/positionSuggestionService", () => service);

const suggestion = {
  id: "suggestion-1",
  kind: "SERVICE" as const,
  title: "Wimpernverlängerung",
  description: "",
  category: "Dienstleistung",
  source: "Leistungskatalog",
  quantity: 1,
  unit: "Std",
  standardPrice: 45.99,
  lastPrice: null,
  taxCategory: "STANDARD" as const,
  taxRate: 19,
};

describe("PositionSuggestionInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.findPositionSuggestions.mockResolvedValue([suggestion]);
  });

  it("behält Vorschläge beim Wechsel vom Textfeld in die Vorschlagsliste geöffnet", async () => {
    const onSelect = vi.fn();
    render(<PositionSuggestionInput ariaLabel="Beschreibung" value="Wimpern" documentType="invoice" currency="EUR" onChange={() => undefined} onSelect={onSelect} />);

    const input = screen.getByRole("combobox", { name: "Beschreibung" });
    await waitFor(() => expect(screen.getByRole("option", { name: /Wimpernverlängerung/ })).toBeInTheDocument(), { timeout: 1000 });
    const option = screen.getByRole("option", { name: /Wimpernverlängerung/ });

    fireEvent.blur(input, { relatedTarget: option });
    expect(option).toBeInTheDocument();

    await userEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith(suggestion);
  });

  it("schließt Vorschläge erst beim Fokuswechsel nach außerhalb", async () => {
    render(<><PositionSuggestionInput ariaLabel="Beschreibung" value="Wimpern" documentType="invoice" currency="EUR" onChange={() => undefined} onSelect={() => undefined} /><button type="button">Außerhalb</button></>);
    const input = screen.getByRole("combobox", { name: "Beschreibung" });
    await screen.findByRole("option", { name: /Wimpernverlängerung/ }, { timeout: 1000 });
    fireEvent.blur(input, { relatedTarget: screen.getByRole("button", { name: "Außerhalb" }) });
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
