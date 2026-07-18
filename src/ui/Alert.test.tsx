import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert } from "./Alert";

describe("Alert", () => {
  it("announces errors immediately and information politely", () => {
    const { rerender } = render(<Alert tone="error" message="Speichern fehlgeschlagen" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Speichern fehlgeschlagen");

    rerender(<Alert tone="info" message="Entwurf gespeichert" />);
    expect(screen.getByRole("status")).toHaveTextContent("Entwurf gespeichert");
  });
});
