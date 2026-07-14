import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppNumberInput } from "@/ui/AppNumberInput";

describe("AppNumberInput", () => {
  it("can be cleared while editing without putting a leading zero back", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <AppNumberInput
        aria-label="Stundensatz"
        value={0}
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Stundensatz" });
    await user.click(input);
    await user.keyboard("{Control>}a{/Control}{Backspace}");

    expect(input).toHaveValue("");
    expect(onValueChange).not.toHaveBeenCalled();

    await user.type(input, "50,99");

    expect(input).toHaveValue("50,99");
    expect(onValueChange).toHaveBeenLastCalledWith(50.99);
  });

  it("shows the configured currency symbol as a visual suffix", () => {
    render(
      <AppNumberInput
        aria-label="Preis"
        value={95}
        suffix="€"
        onValueChange={() => undefined}
      />,
    );

    expect(screen.getByText("€")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Preis" })).toHaveValue("95");
  });
});
