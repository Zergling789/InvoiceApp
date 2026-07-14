import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegalAcceptanceGate } from "./LegalAcceptanceGate";

const getStatus = vi.fn();
const accept = vi.fn();
vi.mock("@/app/legal/legalService", () => ({
  getLegalAcceptanceStatus: () => getStatus(),
  acceptCurrentLegalDocuments: () => accept(),
}));

describe("LegalAcceptanceGate", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("blocks application content until both documents are actively accepted", async () => {
    getStatus.mockResolvedValue({ current: false, requiredVersions: { TERMS: "2026-07-13", PRIVACY: "2026-07-13" } });
    accept.mockResolvedValue({ current: true, requiredVersions: { TERMS: "2026-07-13", PRIVACY: "2026-07-13" } });
    render(<MemoryRouter><LegalAcceptanceGate><div>Geschützter Inhalt</div></LegalAcceptanceGate></MemoryRouter>);

    const button = await screen.findByRole("button", { name: "Zustimmen und fortfahren" });
    expect(button).toBeDisabled();
    expect(screen.queryByText("Geschützter Inhalt")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText("Geschützter Inhalt")).toBeInTheDocument());
    expect(accept).toHaveBeenCalledOnce();
  });
});
