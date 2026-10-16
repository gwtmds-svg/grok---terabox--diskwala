import type { HostKind } from "./types";
import {
  canonicalBlatimUrl,
  canonicalDiskwalaUrl,
  canonicalTeraboxUrl,
  detectHost,
  extractTeraSurl,
  extractUrlsFromText,
  isRedirectorHost,
  normalizePaste,
} from "./parse-url";
import { MEDIA_UA } from "./cdn";

export { normalizePaste, extractUrlsFromText };

const MAX_SHARES = 8;

function unique(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function knownHost(url: string): boolean {
  const h = detectHost(url);
  return h === "terabox" || h === "diskwala" || h === "blatim";
}

function mapRedirector(url: string): string[] {
  if (!isRedirectorHost(url) && detectHost(url) !== "terabox") return [url];
  const surl = extractTeraSurl(url);
  if (!surl) return [url];
  if (!isRedirectorHost(url)) return [url];
  const withOne = surl.startsWith("1") ? surl : `1${surl}`;
  return unique([
    `https://teraboxlink.com/s/${surl}`,
    `https://1024terabox.com/s/${withOne}`,
    `https://1024tera.com/s/${withOne}`,
    canonicalTeraboxUrl(surl),
  ]);
}

function telegramPages(url: string): string[] {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter((p) => p && p !== "s");
    const channel = parts[0];
    const post = parts[1];
    if (!channel || channel.startsWith("+") || channel.startsWith("c")) return [];
    if (post && /^\d+$/.test(post)) {
      return unique([
        `https://t.me/${channel}/${post}?embed=1`,
        `https://t.me/s/${channel}/${post}`,
      ]);
    }
    return [`https://t.me/s/${channel}`];
  } catch {
    return [];
  }
}

function sharesFromHtml(html: string): string[] {
  const hrefs = [
    ...extractUrlsFromText(html),
    ...(html.match(/https?:\/\/(?:www\.)?(?:diskwala|terabox|1024tera|blatim)[^\s"'<>]*/gi) || []),
  ];
  const out: string[] = [];
  for (const raw of hrefs) {
    const u = raw.replace(/[.,;]+$/g, "").replace(/&/g, "&");
    if (knownHost(u)) out.push(u);
  }
  const hexes = html.match(/\b[a-fA-F0-9]{24}\b/g) || [];
  for (const id of hexes) {
    if (/diskwala\.com\/(?:app|playlist|creator)\//i.test(html)) {
      out.push(canonicalDiskwalaUrl(id));
    }
  }
  return unique(out);
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": MEDIA_UA,
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  return res.text();
}

async function scrapeTelegram(url: string): Promise<string[]> {
  const pages = telegramPages(url);
  const found: string[] = [];
  for (const page of pages.slice(0, 2)) {
    try {
      const html = await fetchText(page, 8000);
      found.push(...sharesFromHtml(html));
      if (found.length) break;
    } catch {
      /* public preview can 404 for private channels */
    }
  }
  return unique(found);
}

function sharesFromPaste(text: string): string[] {
  const urls = extractUrlsFromText(text);
  const known = urls.filter(knownHost);
  if (known.length) return unique(known);
  const hex = text.match(/\b[a-fA-F0-9]{24}\b/);
  if (hex) return [canonicalDiskwalaUrl(hex[0])];
  const slug = text.match(/\b[A-Za-z0-9_-]{16}\b/);
  if (slug && /blatim/i.test(text)) return [canonicalBlatimUrl(slug[0])];
  return [];
}

/**
 * Turn a messy Telegram paste, a t.me post, or a /v/ hop into real share URLs.
 * Search uses the first share; Folder Pack can take every extracted share.
 */
export async function expandPaste(raw: string, mode: "one" | "all" = "one"): Promise<string[]> {
  const normalized = normalizePaste(raw);
  if (!normalized) return [];

  const host = detectHost(normalized);
  if (host === "telegram") {
    const nested = await scrapeTelegram(normalized);
    if (nested.length) return (mode === "one" ? nested.slice(0, 1) : nested.slice(0, MAX_SHARES)).map(firstMapped);
  }

  const fromText = sharesFromPaste(normalized);
  if (fromText.length > 1) {
    const mapped = fromText.map(firstMapped);
    return mode === "one" ? mapped.slice(0, 1) : mapped.slice(0, MAX_SHARES);
  }

  const seed = fromText[0] || normalized;
  const mapped = mapRedirector(seed);
  const urls = mapped.length ? mapped : [seed];
  return mode === "one" ? urls.slice(0, 1) : unique(urls).slice(0, MAX_SHARES);
}

function firstMapped(url: string): string {
  const mapped = mapRedirector(url);
  return mapped[0] || url;
}

export function pasteHost(raw: string): HostKind {
  const n = normalizePaste(raw);
  return n ? detectHost(n) : "unknown";
}
