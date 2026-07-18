export const NOTIFICATION_TYPES = [
  "offer_accepted",
  "offer_rejected",
  "offer_viewed",
  "offer_message_received",
  "offer_expiring",
  "invoice_viewed",
  "invoice_paid",
  "invoice_overdue",
  "payment_failed",
  "document_send_failed",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationEntityType = "offer" | "invoice" | "system";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

const notificationTypeSet = new Set<string>(NOTIFICATION_TYPES);

export const isNotificationType = (value: unknown): value is NotificationType =>
  typeof value === "string" && notificationTypeSet.has(value);

export const isNotificationEntityType = (
  value: unknown,
): value is NotificationEntityType =>
  value === "offer" || value === "invoice" || value === "system";

export const isInternalNotificationActionUrl = (value: string | null): value is string =>
  value === "/app" || Boolean(value?.startsWith("/app/"));
