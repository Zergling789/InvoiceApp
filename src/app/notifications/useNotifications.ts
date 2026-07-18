import { useCallback, useEffect, useRef, useState } from "react";

import { parseRealtimeNotification } from "@/db/notificationsDb";
import type { AppNotification } from "@/domain/models/Notification";
import { supabase } from "@/supabaseClient";
import * as notificationService from "./notificationService";

const NOTIFICATION_LIMIT = 15;

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const summary = await notificationService.loadSummary(NOTIFICATION_LIMIT);
      if (generation !== generationRef.current) return;
      setNotifications(summary.notifications);
      setUnreadCount(summary.unreadCount);
      setUserId(summary.userId);
    } catch (caught) {
      if (generation !== generationRef.current) return;
      setError(caught instanceof Error ? caught.message : "Benachrichtigungen konnten nicht geladen werden.");
    } finally {
      if (generation === generationRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      generationRef.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    let refreshTimer: number | undefined;
    const scheduleRefresh = (value: unknown) => {
      if (!parseRealtimeNotification(value)) return;
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refresh(), 80);
    };
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => scheduleRefresh(payload.new),
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  const markAsRead = useCallback(async (id: string) => {
    const current = notifications.find((notification) => notification.id === id);
    if (!current || current.isRead) return;
    try {
      await notificationService.markAsRead(id);
      const readAt = new Date().toISOString();
      setNotifications((items) =>
        items.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true, readAt }
            : notification,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Benachrichtigung konnte nicht aktualisiert werden.");
      throw caught;
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    try {
      await notificationService.markAllAsRead();
      const readAt = new Date().toISOString();
      setNotifications((items) =>
        items.map((notification) => ({ ...notification, isRead: true, readAt })),
      );
      setUnreadCount(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Benachrichtigungen konnten nicht aktualisiert werden.");
      throw caught;
    }
  }, [unreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
