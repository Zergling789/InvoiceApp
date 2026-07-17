import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ModalSheet } from "./ModalSheet";

describe("ModalSheet", () => {
  it("uses the visible viewport and exposes an accessible dialog", () => {
    render(
      <ModalSheet title="Rechnung bearbeiten" isOpen onClose={vi.fn()}>
        <label>
          Bezeichnung
          <input />
        </label>
      </ModalSheet>,
    );

    const dialog = screen.getByRole("dialog", { name: "Rechnung bearbeiten" });
    expect(dialog.parentElement).toHaveClass("app-visual-viewport");
    expect(dialog).toHaveClass("h-full");
    expect(screen.getByLabelText("Bezeichnung")).toBeInTheDocument();
  });

  it("closes from the mobile header", () => {
    const onClose = vi.fn();
    render(
      <ModalSheet title="Angebot bearbeiten" isOpen onClose={onClose}>
        Inhalt
      </ModalSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
