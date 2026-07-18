import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileWarning,
  MessageSquareText,
  ReceiptText,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "@/app/notifications/useNotifications";
import {
  isInternalNotificationActionUrl,
  type AppNotification,
  type NotificationType,
} from "@/domain/models/Notification";

const formatRelativeTime = (value: string, now = Date.now()): string => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Gerade eben";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 45) return "Gerade eben";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `vor ${minutes} ${minutes === 1 ? "Minute" : "Minuten"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} ${hours === 1 ? "Stunde" : "Stunden"}`;
  const days = Math.round(hours / 24);
  if (days < 7) return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(timestamp);
};

const iconForType = (type: NotificationType): ReactNode => {
  const iconProps = { size: 18, "aria-hidden": true } as const;
  switch (type) {
    case "offer_accepted":
      return <CheckCircle2 {...iconProps} className="text-emerald-600" />;
    case "offer_rejected":
      return <XCircle {...iconProps} className="text-red-600" />;
    case "offer_viewed":
    case "invoice_viewed":
      return <Eye {...iconProps} className="text-sky-600" />;
    case "offer_message_received":
      return <MessageSquareText {...iconProps} className="text-violet-600" />;
    case "offer_expiring":
    case "invoice_overdue":
      return <Clock3 {...iconProps} className="text-amber-600" />;
    case "invoice_paid":
      return <ReceiptText {...iconProps} className="text-emerald-600" />;
    case "payment_failed":
      return <CreditCard {...iconProps} className="text-red-600" />;
    case "document_send_failed":
      return <FileWarning {...iconProps} className="text-red-600" />;
    case "system":
      return <AlertTriangle {...iconProps} className="text-amber-600" />;
  }
};

type NotificationItemProps = {
  notification: AppNotification;
  onSelect: (notification: AppNotification) => void;
};

function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  return (
    <button
      type="button"
      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--app-primary)] dark:hover:bg-white/[0.06] ${notification.isRead ? "opacity-75" : "bg-[var(--app-primary)]/[0.045]"}`}
      onClick={() => onSelect(notification)}
    >
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--app-surface-solid)] shadow-sm">
        {iconForType(notification.type)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 font-semibold text-[var(--app-text)]">{notification.title}</span>
          {!notification.isRead && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--app-primary)]" aria-label="Ungelesen" />
          )}
        </span>
        <span className="mt-0.5 block text-sm leading-5 text-[var(--app-muted)]">{notification.message}</span>
        <span className="mt-1 block text-xs text-[var(--app-muted)]">{formatRelativeTime(notification.createdAt)}</span>
      </span>
    </button>
  );
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = async (notification: AppNotification) => {
    if (!notification.isRead) await markAsRead(notification.id).catch(() => undefined);
    setOpen(false);
    if (isInternalNotificationActionUrl(notification.actionUrl)) {
      navigate(notification.actionUrl);
    }
  };

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-solid)] text-[var(--app-text)] transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)] dark:hover:bg-white/10"
        aria-label={unreadCount > 0 ? `Benachrichtigungen, ${unreadCount} ungelesen` : "Benachrichtigungen"}
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--app-surface)]">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="notification-panel"
          role="dialog"
          aria-label="Benachrichtigungen"
          tabIndex={-1}
          className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 max-h-[min(70dvh,36rem)] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] text-[var(--app-text)] shadow-2xl outline-none md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+0.75rem)] md:w-[26rem]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3">
            <div>
              <h2 className="font-semibold">Benachrichtigungen</h2>
              <p className="text-xs text-[var(--app-muted)]">Wichtige Ereignisse auf einen Blick</p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--app-primary)] hover:bg-[var(--app-primary)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-primary)]"
                onClick={() => void markAllAsRead().catch(() => undefined)}
              >
                Alle als gelesen markieren
              </button>
            )}
          </div>

          <div className="max-h-[calc(min(70dvh,36rem)-4.5rem)] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-[var(--app-muted)]" role="status">
                Benachrichtigungen werden geladen …
              </div>
            ) : error ? (
              <div className="p-6 text-center" role="alert">
                <p className="font-semibold">Benachrichtigungen konnten nicht geladen werden</p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">Prüfe deine Verbindung und versuche es erneut.</p>
                <button
                  type="button"
                  className="mt-3 rounded-full border border-[var(--app-border)] px-4 py-2 text-sm font-semibold"
                  onClick={() => void refresh()}
                >
                  Erneut versuchen
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-7 text-center">
                <Bell className="mx-auto text-[var(--app-muted)]" size={26} aria-hidden="true" />
                <p className="mt-3 font-semibold">Keine neuen Benachrichtigungen</p>
                <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">
                  Hier erscheinen wichtige Ereignisse zu deinen Angeboten und Rechnungen.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--app-border)]">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
