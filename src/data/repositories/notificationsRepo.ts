import {
  dbLoadNotificationSummary,
  dbMarkAllNotificationsAsRead,
  dbMarkNotificationAsRead,
} from "@/db/notificationsDb";

export const loadSummary = dbLoadNotificationSummary;
export const markAsRead = dbMarkNotificationAsRead;
export const markAllAsRead = dbMarkAllNotificationsAsRead;
