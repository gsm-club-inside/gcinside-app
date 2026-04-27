import { createHash } from "node:crypto";

const SALT = process.env.ABUSE_HASH_SALT ?? "gcinside-default-salt";

export function hashIdentity(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(`${SALT}:${value}`).digest("hex");
}

export function hashIp(ip: string | null | undefined): string | null {
  return hashIdentity(ip);
}

export function hashDevice(uaPlusFingerprint: string | null | undefined): string | null {
  return hashIdentity(uaPlusFingerprint);
}

export function fingerprintFromHeaders(headers: Headers, sessionId?: string | null): string {
  const ua = headers.get("user-agent") ?? "";
  const lang = headers.get("accept-language") ?? "";
  return `${ua}|${lang}|${sessionId ?? ""}`;
}

export function shortContentHash(content: string | null | undefined): string | null {
  if (!content) return null;
  const normalized = content.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}
