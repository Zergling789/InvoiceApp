import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import MorePage from "@/features/more/MorePage";

describe("MorePage", () => {
  it("uses customer-facing labels and canonical destinations", () => {
    render(<MemoryRouter><MorePage /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /Produkte & Leistungen.*Pakete/i })).toHaveAttribute("href", "/app/positions");
    expect(screen.queryByText(/Positionsgruppe|Katalog/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tarife & Abrechnung/i })).toHaveAttribute("href", "/app/plans");
  });
});
