import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText, LayoutDashboard } from "lucide-react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Topbar } from "@/components/Layout/Topbar";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/ui/FeedbackProvider";

vi.mock("@/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/app/notifications/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Topbar", () => {
  beforeEach(() => {
    window.localStorage.setItem("theme", "light");
  });

  it("zeigt die Hauptnavigation und Feedback im mobilen Menü", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/app/documents"]}>
        <ThemeProvider>
          <ToastProvider>
            <Topbar
              navItems={[
                { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16} />, end: true },
                { to: "/app/documents", label: "Dokumente", icon: <FileText size={16} /> },
              ]}
            />
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.queryByRole("navigation", { name: "Mobile Navigation" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Menü öffnen" }));

    const navigation = screen.getByRole("navigation", { name: "Mobile Navigation" });
    expect(navigation).toBeVisible();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "Dokumente" })).toHaveAttribute("href", "/app/documents");
    expect(screen.getByRole("button", { name: "Feedback" })).toBeVisible();
  });

  it("öffnet das Feedbackformular direkt im mobilen Menü", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ToastProvider>
            <Topbar />
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Menü öffnen" }));
    await user.click(screen.getByRole("button", { name: "Feedback" }));

    expect(screen.getByRole("heading", { name: "Beta-Feedback" })).toBeVisible();
    expect(screen.getByPlaceholderText("Was ist passiert oder was fehlt?")).toBeVisible();
  });
});
