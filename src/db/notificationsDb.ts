import type { AppNotification } from "@/domain/models/Notification";
import {
  isNotificationEntityType,
  isNotificationType,
} from "@/domain/models/Notification";
import type { Database, Json } from "@/lib/supabase.types";
import { supabase } from "@/supabaseClient";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const NOTIFICATION_FIELDS =
  "id,type,title,message,entity_type,entity_id,action_url,metadata,is_read,read_at,created_at" as const;

const requireUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session?.user) throw new Error("Nicht eingeloggt");
  return data.session.user.id;
};

const toMetadata = (value: Json): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const toAppNotification = (row: NotificationRow): AppNotification | null => {
  if (!isNotificationType(row.type)) return null;
  if (row.entity_type !== null && !isNotificationEntityType(row.entity_type)) return null;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actionUrl: row.action_url,
    metadata: toMetadata(row.metadata),
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
};

export const parseRealtimeNotification = (value: unknown): AppNotification | null => {
  if (!value || typeof value !== "object") return null;
  return toAppNotification(value as NotificationRow);
};

export type NotificationSummary = {
  notifications: AppNotification[];
  unreadCount: number;
  userId: string;
};

export async function dbLoadNotificationSummary(limit = 15): Promise<NotificationSummary> {
  const userId = await requireUserId();
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 20);
  const [listResult, countResult] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_FIELDS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  if (listResult.error) throw new Error(listResult.error.message);
  if (countResult.error) throw new Error(countResult.error.message);

  return {
    notifications: (listResult.data ?? [])
      .map((row) => toAppNotification(row as NotificationRow))
      .filter((notification): notification is AppNotification => notification !== null),
    unreadCount: countResult.count ?? 0,
    userId,
  };
}

export async function dbMarkNotificationAsRead(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw new Error(error.message);
}

export async function dbMarkAllNotificationsAsRead(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw new Error(error.message);
}
