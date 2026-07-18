import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import type { AppNotification } from "@/domain/models/Notification";

const hookMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/notifications/useNotifications", () => ({
  useNotifications: hookMock,
}));

const acceptedNotification: AppNotification = {
  id: "notification-1",
  type: "offer_accepted",
  title: "Angebot angenommen",
  message: "Das Angebot ANG-0145 wurde angenommen.",
  entityType: "offer",
  entityId: "offer-1",
  actionUrl: "/app/offers/offer-1",
  metadata: {},
  isRead: false,
  readAt: null,
  createdAt: new Date(Date.now() - 180_000).toISOString(),
};

const defaultHookValue = () => ({
  notifications: [acceptedNotification],
  unreadCount: 1,
  isLoading: false,
  error: null,
  markAsRead: vi.fn().mockResolvedValue(undefined),
  markAllAsRead: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
});

describe("NotificationCenter", () => {
  beforeEach(() => {
    hookMock.mockReset();
    hookMock.mockReturnValue(defaultHookValue());
  });

  it("zeigt Badge und navigiert nach dem Lesen zum Angebot", async () => {
    const user = userEvent.setup();
    const value = defaultHookValue();
    hookMock.mockReturnValue(value);

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <NotificationCenter />
        <Routes>
          <Route path="/app/offers/:id" element={<div>Angebotsziel</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Benachrichtigungen, 1 ungelesen" }));
    expect(screen.getByRole("dialog", { name: "Benachrichtigungen" })).toBeVisible();
    expect(screen.getByText("vor 3 Minuten")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Angebot angenommen/ }));

    expect(value.markAsRead).toHaveBeenCalledWith("notification-1");
    expect(await screen.findByText("Angebotsziel")).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Benachrichtigungen" })).not.toBeInTheDocument();
  });

  it("markiert alle ungelesenen Einträge gesammelt", async () => {
    const user = userEvent.setup();
    const value = defaultHookValue();
    hookMock.mockReturnValue(value);
    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Benachrichtigungen, 1 ungelesen" }));
    await user.click(screen.getByRole("button", { name: "Alle als gelesen markieren" }));

    expect(value.markAllAsRead).toHaveBeenCalledTimes(1);
  });

  it("verbirgt das Badge bei null und zeigt den Leerzustand", async () => {
    const user = userEvent.setup();
    hookMock.mockReturnValue({ ...defaultHookValue(), notifications: [], unreadCount: 0 });
    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);

    const bell = screen.getByRole("button", { name: "Benachrichtigungen" });
    expect(bell).not.toHaveTextContent("0");
    await user.click(bell);

    expect(screen.getByText("Keine neuen Benachrichtigungen")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Alle als gelesen markieren" })).not.toBeInTheDocument();
  });

  it("zeigt einen verständlichen Fehlerzustand mit erneutem Versuch", async () => {
    const user = userEvent.setup();
    const value = { ...defaultHookValue(), notifications: [], unreadCount: 0, error: "network" };
    hookMock.mockReturnValue(value);
    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Benachrichtigungen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Benachrichtigungen konnten nicht geladen werden");
    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(value.refresh).toHaveBeenCalledTimes(1);
  });

  it("begrenzt große ungelesene Zahlen auf 99+", () => {
    hookMock.mockReturnValue({ ...defaultHookValue(), unreadCount: 120 });
    render(<MemoryRouter><NotificationCenter /></MemoryRouter>);
    expect(screen.getByText("99+")).toBeVisible();
  });
});
