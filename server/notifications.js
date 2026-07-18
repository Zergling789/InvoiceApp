import { logEvent } from "./observability.js";

export const NOTIFICATION_TYPES = new Set([
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
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTERNAL_ACTION_PATTERN = /^\/app(?:\/|$)[A-Za-z0-9_/?=&%.-]*$/;

const notificationInputError = (code) => {
  const error = new Error(code);
  error.code = code;
  error.status = 400;
  return error;
};

export async function createNotification(db, input) {
  const userId = String(input?.userId ?? "");
  const type = String(input?.type ?? "");
  const title = String(input?.title ?? "").trim();
  const message = String(input?.message ?? "").trim();
  const entityType = input?.entityType == null ? null : String(input.entityType);
  const entityId = input?.entityId == null ? null : String(input.entityId);
  const actionUrl = input?.actionUrl == null ? null : String(input.actionUrl);
  const eventKey = input?.eventKey == null ? null : String(input.eventKey).trim();
  const metadata = input?.metadata ?? {};

  if (!UUID_PATTERN.test(userId)) throw notificationInputError("NOTIFICATION_USER_INVALID");
  if (!NOTIFICATION_TYPES.has(type)) throw notificationInputError("NOTIFICATION_TYPE_INVALID");
  if (!title || title.length > 160 || !message || message.length > 1000) {
    throw notificationInputError("NOTIFICATION_CONTENT_INVALID");
  }
  if (entityType !== null && !["offer", "invoice", "system"].includes(entityType)) {
    throw notificationInputError("NOTIFICATION_ENTITY_INVALID");
  }
  if (entityId !== null && !UUID_PATTERN.test(entityId)) {
    throw notificationInputError("NOTIFICATION_ENTITY_INVALID");
  }
  if (actionUrl !== null && (actionUrl.length > 500 || !INTERNAL_ACTION_PATTERN.test(actionUrl))) {
    throw notificationInputError("NOTIFICATION_ACTION_URL_INVALID");
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw notificationInputError("NOTIFICATION_METADATA_INVALID");
  }
  if (eventKey !== null && (!eventKey || eventKey.length > 200)) {
    throw notificationInputError("NOTIFICATION_EVENT_KEY_INVALID");
  }

  const { data, error } = await db.rpc("create_notification", {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_action_url: actionUrl,
    p_metadata: metadata,
    p_event_key: eventKey,
  });

  if (error || !data) {
    logEvent("warn", "notification_create_failed", {
      errorCode: "NOTIFICATION_CREATE_FAILED",
      notificationType: NOTIFICATION_TYPES.has(type) ? type : "invalid",
      hasEventKey: Boolean(eventKey),
    });
    const failure = new Error("NOTIFICATION_CREATE_FAILED");
    failure.code = "NOTIFICATION_CREATE_FAILED";
    failure.status = 500;
    throw failure;
  }

  return data;
}
