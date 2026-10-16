import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const WALLED = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "googlevideo.com",
  "netflix.com",
  "nflxvideo.net",
  "nflxso.net",
  "disneyplus.com",
  "hulu.com",
  "primevideo.com",
  "spotify.com",
  "scdn.co",
  "hotstar.com",
  "hbomax.com",
  "max.com",
  "tv.apple.com",
  "vimeo.com",
  "dailymotion.com",
  "tiktok.com",
];

const dnsCache = new Map<string, { at: number; ok: boolean }>();
const DNS_TTL = 60_000;

export function isWalledHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  return WALLED.some((d) => host === d || host.endsWith(`.${d}`));
}

function privateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function privateIP(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower.includes(".")) {
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return privateIPv4(mapped[1]);
  }
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (isIP(lower) === 4) return privateIPv4(lower);
  return false;
}

/** https/http only, no credentials, no loopback, link-local, or private DNS. */
export async function isPublicHttpUrl(raw: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (host.endsWith(".internal") || host === "metadata.google.internal") return false;
  if (/^\d+$/.test(host)) return false;

  const dotted = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (dotted) {
    if (dotted.slice(1).some((p) => p.length > 1 && p.startsWith("0"))) return false;
    return !privateIPv4(dotted.slice(1).map((p) => String(Number(p))).join("."));
  }
  if (isIP(host)) return !privateIP(host);

  const cached = dnsCache.get(host);
  const now = Date.now();
  if (cached && now - cached.at < DNS_TTL) return cached.ok;
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    const ok = records.length > 0 && records.every((r) => !privateIP(r.address));
    dnsCache.set(host, { at: now, ok });
    return ok;
  } catch {
    dnsCache.set(host, { at: now, ok: false });
    return false;
  }
}
