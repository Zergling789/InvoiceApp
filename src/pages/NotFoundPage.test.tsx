import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { NotFoundPage } from "@/pages/NotFoundPage";

describe("NotFoundPage", () => {
  it("offers safe public destinations", () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Seite nicht gefunden" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Anmelden" })).toHaveAttribute("href", "/login");
  });

  it("keeps authenticated users inside the work area", () => {
    render(<MemoryRouter><NotFoundPage authenticated /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Zum Dashboard" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "Zu den Dokumenten" })).toHaveAttribute("href", "/app/documents");
  });
});
