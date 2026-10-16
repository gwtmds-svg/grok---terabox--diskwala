import type { HostKind } from "./types";

const TERABOX_HOSTS = [
  "terabox.com",
  "terabox.app",
  "terabox.fun",
  "teraboxapp.com",
  "teraboxshare.com",
  "teraboxlink.com",
  "teraboxlinke.com",
  "terasharelink.com",
  "terafileshare.com",
  "terasharefile.com",
  "terashareus.com",
  "teraboxurl.com",
  "terabox.link",
  "teraboxfree.com",
  "teraboxsharefile.com",
  "terabox.club",
  "terabox.click",
  "1024tera.com",
  "1024tera.co",
  "1024terabox.com",
  "1024-terabox.com",
  "1024box.com",
  "tera1024box.com",
  "dubox.com",
  "freeterabox.com",
  "4funbox.com",
  "4funbox.co",
  "nephobox.com",
  "mirrobox.com",
  "momerybox.com",
  "tibibox.com",
  "gibibox.com",
  "pebibox.com",
  "cybernewhub.com",
];

const DISKWALA_HOSTS = ["diskwala.com", "diskwala.app", "diskwala.net", "diskwala.in"];

const BLATIM_HOSTS = ["blatim.com", "blatim.app"];

const TELEGRAM_HOSTS = ["t.me", "telegram.me", "telegram.dog", "telegram.org"];

const SURL_RE = /^[A-Za-z0-9_-]{8,64}$/;
const HEX24_RE = /\b[a-fA-F0-9]{24}\b/;
const HTTP_URL_RE = /https?:\/\/[^\s<>"'\]\)]+/gi;

function hostnameOf(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isTeraboxHost(host: string): boolean {
  if (TERABOX_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  if (host.includes("terabox") || host.includes("terashare") || host.includes("terafile")) return true;
  if (host.includes("1024tera") || host.includes("funbox") || host.includes("nephobox")) return true;
  if (host.includes("mirrobox") || host.includes("momerybox") || host.includes("tibibox")) return true;
  if (/(^|\.)tera/.test(host) && /link|share|box|file|hub/.test(host)) return true;
  return false;
}

export function detectHost(raw: string): HostKind {
  const host = hostnameOf(raw);
  if (!host) return "unknown";
  if (TELEGRAM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "telegram";
  if (isTeraboxHost(host)) return "terabox";
  if (DISKWALA_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "diskwala";
  if (BLATIM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "blatim";
  return "unknown";
}

export function isRedirectorHost(raw: string): boolean {
  const host = hostnameOf(raw);
  if (!host) return false;
  return (
    host.includes("linke") ||
    host.includes("cybernewhub") ||
    host.includes("staela") ||
    host.endsWith("teraboxlinke.com")
  );
}

/**
 * TeraBox short codes:
 *   https://1024tera.com/s/1XXXX  → keep the path as-is; variants try with and without the 1
 *   https://www.1024tera.com/sharing/link?surl=XXXX
 *   https://terabox.com/s/XXXX
 *   https://teraboxlinke.com/v/XXXX   (JS hop onto teraboxlink / 1024terabox)
 *   https://www.terabox.app/wap/share/filelist?surl=XXXX
 */
export function extractTeraSurl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const q = u.searchParams.get("surl") || u.searchParams.get("shorturl") || u.searchParams.get("s");
    if (q) return normalizeSurl(q);
    const parts = u.pathname.split("/").filter(Boolean);
    const markers = new Set(["s", "share", "sharing", "filelist", "v", "link", "watch", "f", "video"]);
    const sIdx = parts.findIndex((p) => markers.has(p.toLowerCase()));
    if (sIdx >= 0 && parts[sIdx + 1]) {
      const next = decodeURIComponent(parts[sIdx + 1]).split(/[.?#]/)[0];
      if (next && next.toLowerCase() !== "link" && next.toLowerCase() !== "filelist" && next.toLowerCase() !== "player") {
        return normalizeSurl(next);
      }
    }
    const last = parts[parts.length - 1];
    if (last && SURL_RE.test(last) && last.toLowerCase() !== "player") return normalizeSurl(last);
    return null;
  } catch {
    return null;
  }
}

function normalizeSurl(surl: string): string {
  return decodeURIComponent(surl).trim().replace(/\/+$/, "");
}

/** Official 1024tera /s/1XXXX vs raw XXXX — try both, never guess only one. */
export function surlVariants(surl: string): string[] {
  const s = normalizeSurl(surl);
  if (!s) return [];
  const out = [s];
  if (/^1[\w-]{8,}$/.test(s)) out.push(s.slice(1));
  else out.push(`1${s}`);
  return uniqueStrings(out);
}

function uniqueStrings(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** Diskwala share ids live at /app/:id (24-char hex), /playlist/:id, /f/:id, or ?id= */
export function extractDiskwalaId(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const q = u.searchParams.get("id") || u.searchParams.get("file_id") || u.searchParams.get("fid");
    if (q && /^[a-f0-9]{16,}$/i.test(q)) return q;
    const parts = u.pathname.split("/").filter(Boolean);
    const appIdx = parts.findIndex(
      (p) =>
        p === "app" ||
        p === "f" ||
        p === "file" ||
        p === "v" ||
        p === "playlist" ||
        p === "creator" ||
        p === "share" ||
        p === "watch" ||
        p === "p",
    );
    if (appIdx >= 0 && parts[appIdx + 1]) return parts[appIdx + 1].split(".")[0];
    const last = parts[parts.length - 1];
    if (last && /^[a-f0-9]{16,}$/i.test(last)) return last;
    return null;
  } catch {
    const m = raw.match(HEX24_RE);
    return m ? m[0] : null;
  }
}

export function canonicalTeraboxUrl(surl: string): string {
  const code = surl.replace(/^1/, "");
  return `https://www.1024tera.com/sharing/link?surl=${encodeURIComponent(code)}`;
}

export function canonicalDiskwalaUrl(id: string, kind: "app" | "playlist" | "creator" = "app"): string {
  return `https://www.diskwala.com/${kind}/${id}`;
}

/** Blatim public watch ids live at /watch/:slug (16-char base62). */
export function extractBlatimSlug(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    const watchIdx = parts.findIndex((p) => p === "watch" || p === "v" || p === "video" || p === "f");
    if (watchIdx >= 0 && parts[watchIdx + 1]) {
      const slug = decodeURIComponent(parts[watchIdx + 1]).split("?")[0];
      if (/^[A-Za-z0-9_-]{6,64}$/.test(slug)) return slug;
    }
    const last = parts[parts.length - 1];
    if (last && /^[A-Za-z0-9_-]{8,64}$/.test(last) && last !== "watch") return last;
    return null;
  } catch {
    return null;
  }
}

export function canonicalBlatimUrl(slug: string): string {
  return `https://www.blatim.com/watch/${encodeURIComponent(slug)}`;
}

export function extractUrlsFromText(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.match(HTTP_URL_RE) || []) {
    const u = raw.replace(/[.,;:!?]+$/g, "");
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** Strip Telegram junk / zero-width chars and pick the first real share URL. */
export function normalizePaste(raw: string): string {
  const text = raw.replace(/[\u200b\u200c\u200d\ufeff]/g, " ").trim();
  if (!text) return "";
  const urls = extractUrlsFromText(text);
  const ranked = urls.map((u) => ({ u, host: detectHost(u) }));
  const known = ranked.find((r) => r.host === "terabox" || r.host === "diskwala" || r.host === "blatim");
  if (known) return known.u;
  const tg = ranked.find((r) => r.host === "telegram");
  if (tg) return tg.u;
  if (urls[0]) return urls[0];
  const hex = text.match(HEX24_RE);
  if (hex) return canonicalDiskwalaUrl(hex[0]);
  return text;
}

export function teraboxCandidateUrls(shareUrl: string): string[] {
  const surl = extractTeraSurl(shareUrl);
  if (!surl) return [shareUrl];
  const variants = surlVariants(surl);
  const mapped: string[] = [shareUrl];
  for (const s of variants) {
    const withOne = s.startsWith("1") ? s : `1${s}`;
    mapped.push(
      `https://1024terabox.com/s/${withOne}`,
      `https://1024tera.com/s/${withOne}`,
      `https://teraboxlink.com/s/${s}`,
      canonicalTeraboxUrl(s),
    );
  }
  return uniqueStrings(mapped).slice(0, 6);
}
