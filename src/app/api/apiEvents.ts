export const API_SESSION_EXPIRED_EVENT = "freelanceflow:session-expired";

export type SessionExpiredEventDetail = {
  requestId?: string;
};

export const notifySessionExpired = (detail: SessionExpiredEventDetail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SessionExpiredEventDetail>(API_SESSION_EXPIRED_EVENT, { detail }),
  );
};
