/**
 * Server-side TeraBox session. Filled by email/password login (Playwright)
 * or by a pasted ndus. Never stores the password. Lost on process restart
 * unless the client also saved ndus in localStorage and sends it back.
 */

let cookieHeader = "";
let emailMasked = "";
let savedAt = 0;

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "account";
  const u = user.length <= 2 ? `${user[0] ?? "*"}*` : `${user.slice(0, 2)}…`;
  return `${u}@${domain}`;
}

export function setSessionCookie(cookie: string, email = ""): void {
  cookieHeader = cookie
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .join("; ");
  if (email) emailMasked = maskEmail(email);
  savedAt = cookieHeader ? Date.now() : 0;
}

export function getSessionCookie(): string {
  return cookieHeader;
}

export function clearSession(): void {
  cookieHeader = "";
  emailMasked = "";
  savedAt = 0;
}

export function sessionInfo(): {
  active: boolean;
  emailMasked: string;
  ndusTail: string;
  ageMs: number;
} {
  const ndus = cookieHeader.match(/(?:^|;\s*)ndus=([^;]+)/i)?.[1] ?? "";
  return {
    active: Boolean(ndus),
    emailMasked,
    ndusTail: ndus ? ndus.slice(-8) : "",
    ageMs: savedAt ? Date.now() - savedAt : 0,
  };
}

export function mergeCookies(...parts: Array<string | undefined>): string {
  const map = new Map<string, string>();
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split(";")) {
      const trimmed = pair.trim();
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1));
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
