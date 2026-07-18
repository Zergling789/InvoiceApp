import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConfirmProvider, ToastProvider, useConfirm, useToast } from "@/ui/FeedbackProvider";

function ErrorTrigger() {
  const toast = useToast();
  return <button onClick={() => toast.error("Finalisierung fehlgeschlagen")}>Fehler auslösen</button>;
}

function ConfirmTrigger() {
  const { confirm } = useConfirm();
  return (
    <button
      onClick={() => void confirm({
        title: "Rechnung finalisieren",
        message: "Bitte prüfen.",
        acknowledgementLabel: "Ich habe geprüft.",
      })}
    >
      Finalisieren
    </button>
  );
}

describe("ToastProvider", () => {
  it("renders errors above document and confirmation overlays", () => {
    const { container } = render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Fehler auslösen" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Finalisierung fehlgeschlagen");
    expect(
      container.querySelector(".fixed.inset-x-4")
    ).toHaveClass("z-[100]");
  });
});

describe("ConfirmProvider", () => {
  it("requires an explicit acknowledgement when configured", () => {
    render(
      <ConfirmProvider>
        <ConfirmTrigger />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Finalisieren" }));
    const submit = screen.getByRole("button", { name: "Bestätigen" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Ich habe geprüft." }));
    expect(submit).toBeEnabled();
  });
});
