const REPORT_KINDS = new Set([
  "REACT_RENDER_ERROR",
  "UNHANDLED_ERROR",
  "UNHANDLED_REJECTION",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_PATH_PATTERN = /^\/[A-Za-z0-9_./:%-]*$/;
const OPAQUE_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{25,}$/;

function invalidReport() {
  const error = new Error("Invalid client error report");
  error.code = "CLIENT_ERROR_REPORT_INVALID";
  error.status = 400;
  return error;
}

export function normalizeClientRoute(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) throw invalidReport();
  const pathname = value.split(/[?#]/, 1)[0];
  if (!SAFE_PATH_PATTERN.test(pathname)) throw invalidReport();

  const segments = pathname.split("/");
  return segments
    .map((segment, index) => {
      if (!segment) return segment;
      if (segments[index - 1] === "recipient") return ":token";
      if (UUID_PATTERN.test(segment) || OPAQUE_SEGMENT_PATTERN.test(segment)) return ":id";
      return segment;
    })
    .join("/");
}

export function parseClientErrorReport(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw invalidReport();
  if (!UUID_PATTERN.test(body.errorId ?? "")) throw invalidReport();
  if (!REPORT_KINDS.has(body.kind)) throw invalidReport();

  return {
    errorId: body.errorId,
    kind: body.kind,
    route: normalizeClientRoute(body.route),
  };
}
