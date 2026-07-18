import * as repo from "@/data/repositories/notificationsRepo";

export const loadSummary = (limit = 15) => repo.loadSummary(limit);
export const markAsRead = (id: string) => repo.markAsRead(id);
export const markAllAsRead = () => repo.markAllAsRead();
