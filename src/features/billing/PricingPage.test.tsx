import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import PricingPage from "@/features/billing/PricingPage";

const getBillingStatusMock = vi.fn();

vi.mock("@/app/billing/billingService", () => ({
  getBillingStatus: () => getBillingStatusMock(),
  createCheckout: vi.fn(),
  createBillingPortal: vi.fn(),
}));

describe("PricingPage status recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/app/plans");
  });

  it("blocks plan changes until the billing status can be loaded", async () => {
    getBillingStatusMock
      .mockRejectedValueOnce(new Error("private provider detail"))
      .mockResolvedValueOnce({
        subscription: {
          plan_key: "BASIS",
          status: "ACTIVE",
          current_period_end: null,
          cancel_at_period_end: false,
          payment_failed_at: null,
        },
      });
    renderWithProviders(<PricingPage />, { route: "/app/plans" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Tarifstatus konnte nicht geladen werden");
    expect(screen.queryByText("private provider detail")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solo wählen" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await waitFor(() => expect(getBillingStatusMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Solo wählen" })).toBeEnabled();
  });
});
