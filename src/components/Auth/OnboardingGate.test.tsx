import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingGate } from "./OnboardingGate";

const getProgress = vi.fn();

vi.mock("@/app/onboarding/onboardingService", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/onboarding/onboardingService")
  >("@/app/onboarding/onboardingService");
  return {
    ...actual,
    getOnboardingProgress: () => getProgress(),
  };
});

describe("OnboardingGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("leitet neue Nutzer in die Einrichtung", async () => {
    getProgress.mockResolvedValue({
      step: "WELCOME",
      completedAt: null,
      clientId: null,
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route
            path="/app"
            element={
              <OnboardingGate>
                <div>Arbeitsbereich</div>
              </OnboardingGate>
            }
          />
          <Route path="/app/onboarding" element={<div>Einrichtung</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Einrichtung")).toBeInTheDocument();
    expect(screen.queryByText("Arbeitsbereich")).not.toBeInTheDocument();
  });

  it("lässt eingerichtete Nutzer in den Arbeitsbereich", async () => {
    getProgress.mockResolvedValue({
      step: "DONE",
      completedAt: "2026-07-17T10:00:00.000Z",
      clientId: "client-1",
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <OnboardingGate>
          <div>Arbeitsbereich</div>
        </OnboardingGate>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Arbeitsbereich")).toBeInTheDocument(),
    );
  });
});
