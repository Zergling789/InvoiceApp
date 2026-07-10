import crypto from "crypto";

export const extractEmailAddress = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = raw.match(/<([^>]+)>/);
  return match?.[1]?.trim() ?? raw;
};

export const sanitizeFilename = (name = "") =>
  String(name)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "document";

export const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

export const parseEmailList = (value = "") =>
  String(value)
    .split(/[;,]/)
    .map(normalizeEmail)
    .filter(Boolean);

export const generateToken = () => crypto.randomBytes(32).toString("base64url");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token, "utf8").digest("hex");
