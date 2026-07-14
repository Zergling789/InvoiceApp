import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider, useToast } from "@/ui/FeedbackProvider";

function ErrorTrigger() {
  const toast = useToast();
  return <button onClick={() => toast.error("Finalisierung fehlgeschlagen")}>Fehler ausl?sen</button>;
}

describe("ToastProvider", () => {
  it("renders errors above document and confirmation overlays", () => {
    const { container } = render(
      <ToastProvider>
        <ErrorTrigger />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Fehler ausl?sen" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Finalisierung fehlgeschlagen");
    expect(
      container.querySelector(".fixed.inset-x-4")
    ).toHaveClass("z-[100]");
  });
});
