import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BottomActionBar } from "./BottomActionBar";

describe("BottomActionBar", () => {
  it("exposes an accessible menu and closes it with Escape", () => {
    render(
      <BottomActionBar
        primaryLabel="Speichern"
        onPrimary={vi.fn()}
        menuActions={[{ label: "Entwurf löschen", onClick: vi.fn(), danger: true }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mehr Optionen" }));
    expect(screen.getByRole("button", { name: "Entwurf löschen" })).toBeVisible();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Entwurf löschen" })).not.toBeInTheDocument();
  });
});
