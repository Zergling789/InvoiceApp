import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OfferCreatePage from "./OfferCreatePage";

const completeOnboarding = vi.fn();

vi.mock("@/app/onboarding/onboardingService", () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
}));

vi.mock("@/components/ui/ModalSheet", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/documents/create/OfferForm", () => ({
  default: ({
    onSaved,
    onClose,
  }: {
    onSaved: (document: { id: string; type: "offer" }) => Promise<void>;
    onClose: (force?: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={async () => {
        await onSaved({ id: "offer-1", type: "offer" });
        onClose(true);
      }}
    >
      Angebot speichern
    </button>
  ),
}));

function LocationView() {
  const location = useLocation();
  return <div>Ziel: {location.pathname}</div>;
}

describe("OfferCreatePage onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeOnboarding.mockResolvedValue({
      step: "DONE",
      completedAt: "2026-07-17T10:00:00.000Z",
      clientId: "client-1",
    });
  });

  it("schließt die Einrichtung erst nach dem Speichern ab und kehrt zurück", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/app/offers/new?onboarding=1&clientId=client-1&returnUrl=%2Fapp%2Fonboarding",
        ]}
      >
        <Routes>
          <Route path="/app/offers/new" element={<OfferCreatePage />} />
          <Route path="/app/onboarding" element={<LocationView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(completeOnboarding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Angebot speichern" }));

    await waitFor(() =>
      expect(completeOnboarding).toHaveBeenCalledWith("client-1"),
    );
    expect(await screen.findByText("Ziel: /app/onboarding")).toBeInTheDocument();
  });
});
