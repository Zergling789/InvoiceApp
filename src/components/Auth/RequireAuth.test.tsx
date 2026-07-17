import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      signOut: authMocks.signOut,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
  },
}));

vi.mock("./LegalAcceptanceGate", () => ({
  LegalAcceptanceGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./OnboardingGate", () => ({
  OnboardingGate: ({ children }: { children: React.ReactNode }) => children,
}));

import { API_SESSION_EXPIRED_EVENT } from "@/app/api/apiEvents";
import RequireAuth from "./RequireAuth";

const renderGuard = () => render(
  <MemoryRouter initialEntries={["/app"]}>
    <Routes>
      <Route path="/app" element={<RequireAuth><div>Geschützter Inhalt</div></RequireAuth>} />
      <Route path="/login" element={<div>Anmeldung</div>} />
    </Routes>
  </MemoryRouter>,
);

describe("RequireAuth", () => {
  beforeEach(() => {
    authMocks.getSession.mockReset();
    authMocks.signOut.mockReset().mockResolvedValue({ error: null });
    authMocks.unsubscribe.mockReset();
    authMocks.onAuthStateChange.mockReset().mockReturnValue({
      data: { subscription: { unsubscribe: authMocks.unsubscribe } },
    });
  });

  it("redirects an expired server session and clears it locally", async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });
    renderGuard();
    expect(await screen.findByText("Geschützter Inhalt")).toBeInTheDocument();

    fireEvent(window, new CustomEvent(API_SESSION_EXPIRED_EVENT));

    expect(await screen.findByText("Anmeldung")).toBeInTheDocument();
    expect(authMocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("keeps an auth check error recoverable", async () => {
    authMocks.getSession
      .mockResolvedValueOnce({ data: { session: null }, error: new Error("network") })
      .mockResolvedValueOnce({ data: { session: { access_token: "token" } }, error: null });
    renderGuard();
    expect(await screen.findByRole("alert")).toHaveTextContent("Anmeldung konnte nicht geprüft werden");

    await userEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    await waitFor(() => expect(screen.getByText("Geschützter Inhalt")).toBeInTheDocument());
  });
});
