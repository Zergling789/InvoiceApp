import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppNotification } from "@/domain/models/Notification";
import { useNotifications } from "./useNotifications";

const serviceMock = vi.hoisted(() => ({
  loadSummary: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));
const realtimeMock = vi.hoisted(() => ({
  callback: null as null | ((payload: { new: Record<string, unknown> }) => void),
  config: null as null | Record<string, unknown>,
  removeChannel: vi.fn(),
}));

vi.mock("./notificationService", () => serviceMock);
vi.mock("@/supabaseClient", () => {
  const channel = {
    on: vi.fn((_kind, config, callback) => {
      realtimeMock.config = config;
      realtimeMock.callback = callback;
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  return {
    supabase: {
      channel: vi.fn(() => channel),
      removeChannel: realtimeMock.removeChannel,
    },
  };
});

const notification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: "notification-1",
  type: "offer_accepted",
  title: "Angebot angenommen",
  message: "Das Angebot wurde angenommen.",
  entityType: "offer",
  entityId: "offer-1",
  actionUrl: "/app/offers/offer-1",
  metadata: {},
  isRead: false,
  readAt: null,
  createdAt: "2026-07-18T12:00:00.000Z",
  ...overrides,
});

const realtimeRow = (entry: AppNotification) => ({
  id: entry.id,
  user_id: "user-1",
  type: entry.type,
  title: entry.title,
  message: entry.message,
  entity_type: entry.entityType,
  entity_id: entry.entityId,
  action_url: entry.actionUrl,
  metadata: entry.metadata,
  event_key: null,
  is_read: entry.isRead,
  read_at: entry.readAt,
  created_at: entry.createdAt,
});

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeMock.callback = null;
    realtimeMock.config = null;
    serviceMock.loadSummary.mockResolvedValue({
      notifications: [notification()],
      unreadCount: 1,
      userId: "user-1",
    });
    serviceMock.markAsRead.mockResolvedValue(undefined);
    serviceMock.markAllAsRead.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lädt eine begrenzte Übersicht und markiert einzelne sowie alle Einträge", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(serviceMock.loadSummary).toHaveBeenCalledWith(15);

    await act(async () => result.current.markAsRead("notification-1"));
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0]?.isRead).toBe(true);

    serviceMock.loadSummary.mockResolvedValue({
      notifications: [notification(), notification({ id: "notification-2" })],
      unreadCount: 2,
      userId: "user-1",
    });
    await act(async () => result.current.refresh());
    await act(async () => result.current.markAllAsRead());
    expect(serviceMock.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((entry) => entry.isRead)).toBe(true);
  });

  it("abonniert genau den eigenen Nutzer und aktualisiert nach einem Realtime-Ereignis", async () => {
    const { result, unmount } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(realtimeMock.callback).not.toBeNull());
    expect(realtimeMock.config).toMatchObject({
      table: "notifications",
      filter: "user_id=eq.user-1",
    });

    const second = notification({ id: "notification-2", type: "offer_viewed", title: "Angebot geöffnet" });
    serviceMock.loadSummary.mockResolvedValue({
      notifications: [second, notification()],
      unreadCount: 2,
      userId: "user-1",
    });
    act(() => realtimeMock.callback?.({ new: realtimeRow(second) }));

    await waitFor(() => expect(result.current.unreadCount).toBe(2));
    expect(result.current.notifications[0]?.id).toBe("notification-2");

    unmount();
    expect(realtimeMock.removeChannel).toHaveBeenCalledTimes(1);
  });
});
