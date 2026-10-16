import type { ResolveResult, ResolvedFile } from "./types";
import { detectHost, normalizePaste } from "./parse-url";
import { resolveShare } from "./index";
import { putMedia, putPack } from "./media-cache";
import { fetchPublic } from "./proxy";
import { isPublicHttpUrl, isWalledHost } from "./public-url";

const MAX_FILES = 30;
const MAX_HTML = 1_200_000;
const MAX_FRAME_HTML = 400_000;
const MEDIA_EXT = /\.(mp4|webm|m4v|mov|mkv|ogv|ogg|m3u8)(?:$|[?#])/i;
const PLAYABLE_EXT = /\.(mp4|webm|m4v|mov|ogv|ogg|m3u8)(?:$|[?#])/i;
const FRAME_SKIP =
  /doubleclick|googlesyndication|googleadservices|google-analytics|googletagmanager|gstatic|facebook\.com|facebook\.net|fbcdn|hotjar|adservice|adnxs|scorecard|taboola|outbrain|moatads|amazon-adsystem|criteo|cookielaw|recaptcha|youtube|youtu\.be|vimeo|tiktok|dailymotion|netflix|spotify|googlevideo/i;

const hits: number[] = [];

function underLimit(): boolean {
  const now = Date.now();
  while (hits.length && hits[0] < now - 30_000) hits.shift();
  if (hits.length >= 24) return false;
  hits.push(now);
  return true;
}

function decodeEntities(raw: string): string {
  return raw
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/"/gi, '"')
    .replace(/&#0*39;|'/gi, "'")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeTitle(raw: string): string {
  return decodeEntities(raw).slice(0, 140);
}

function flatten(html: string): string {
  return html
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002f/gi, "/")
    .replace(/\\u003d/gi, "=")
    .replace(/\\u003a/gi, ":")
    .replace(/\\\//g, "/")
    .replace(/&/gi, "&")
    .replace(/"/gi, '"')
    .replace(/&#0*39;|'/gi, "'")
    .replace(/&#x2f;/gi, "/");
}

function resolveAgainst(raw: string, base: string): string | null {
  let cleaned = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned || cleaned.startsWith("blob:") || cleaned.startsWith("data:") || cleaned.startsWith("javascript:")) {
    return null;
  }
  if (/%[0-9a-f]{2}/i.test(cleaned)) {
    try {
      const decoded = decodeURIComponent(cleaned);
      if (decoded.startsWith("http") || decoded.startsWith("//") || decoded.startsWith("/")) cleaned = decoded;
    } catch {
      /* keep */
    }
  }
  try {
    const url = new URL(cleaned, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function looksLikeMedia(url: URL): boolean {
  return MEDIA_EXT.test(url.pathname) || MEDIA_EXT.test(url.href);
}

/** Public file URLs published in HTML: video tags, og:video, JSON-LD, and bare media links. */
export function collectMediaUrls(html: string, base: string): string[] {
  const flat = flatten(html);
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string, loose: boolean) => {
    const abs = resolveAgainst(raw, base);
    if (!abs || seen.has(abs)) return;
    let url: URL;
    try {
      url = new URL(abs);
    } catch {
      return;
    }
    if (isWalledHost(url.hostname)) return;
    if (!loose && !looksLikeMedia(url)) return;
    seen.add(abs);
    found.push(abs);
  };

  const tagRe = /<(video|source|meta|a)\b[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(flat))) {
    const el = tag[0];
    const kind = tag[1].toLowerCase();
    if (kind === "meta") {
      const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(el)?.[1]?.toLowerCase() ?? "";
      if (!/^(og:video(?::(?:url|secure_url))?|twitter:player:stream)$/.test(key)) continue;
      const content = /content\s*=\s*["']([^"']+)["']/i.exec(el)?.[1];
      if (content) add(content, true);
      continue;
    }
    if (kind === "a") {
      const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(el)?.[1];
      if (href) add(href, false);
      continue;
    }
    for (const attr of ["src", "data-src", "data-video", "data-video-src", "data-mp4", "data-hls", "data-file"]) {
      const m = new RegExp(String.raw`\b${attr}\s*=\s*["']([^"']+)["']`, "i").exec(el);
      if (m) add(m[1], true);
    }
  }

  const attrRe =
    /\b(?:data-video-src|data-mp4|data-hls|data-file|data-video)\s*=\s*["']([^"']+)["']/gi;
  let attr: RegExpExecArray | null;
  while ((attr = attrRe.exec(flat))) add(attr[1], false);

  const jsonRe =
    /"(contentUrl|file|src|videoUrl|video_url|hlsUrl|hls_url|mp4|playbackUrl|streamUrl|stream_url|source)"\s*:\s*"((?:https?:)?[^"]+)"/gi;
  let jm: RegExpExecArray | null;
  while ((jm = jsonRe.exec(flat))) {
    const key = jm[1].toLowerCase();
    const loose = /contenturl|videourl|video_url|hlsurl|hls_url|mp4|playbackurl|streamurl|stream_url/.test(key);
    add(jm[2], loose);
  }

  const bare =
    /https?:\/\/[^\s"'<>]{6,700}\.(?:mp4|webm|m4v|mov|mkv|ogv|ogg|m3u8)(?:\?[^\s"'<>]*)?/gi;
  let bm: RegExpExecArray | null;
  while ((bm = bare.exec(flat))) add(bm[0].replace(/[),.;]+$/g, ""), false);

  const encoded =
    /https%3A%2F%2F[^"'&\s]{10,700}\.(?:mp4|webm|m4v|mov|mkv|ogv|ogg|m3u8)/gi;
  let em: RegExpExecArray | null;
  while ((em = encoded.exec(flat))) add(em[0], false);

  return found.slice(0, MAX_FILES * 3);
}

export function collectPlayerFrames(html: string, base: string): string[] {
  const flat = flatten(html);
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<(?:iframe|embed)\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat))) {
    const abs = resolveAgainst(m[1], base);
    if (!abs || seen.has(abs)) continue;
    let url: URL;
    try {
      url = new URL(abs);
    } catch {
      continue;
    }
    const host = url.hostname.toLowerCase();
    if (isWalledHost(host) || FRAME_SKIP.test(host) || FRAME_SKIP.test(url.href)) continue;
    seen.add(abs);
    out.push(abs);
    if (out.length >= 3) break;
  }
  return out;
}

function fileName(url: string, index: number): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    const clean = last.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 120);
    if (clean && clean !== "_" && clean !== ".") return clean;
  } catch {
    /* ignore */
  }
  return `video-${index + 1}.mp4`;
}

function toFile(url: string, index: number, referer: string): ResolvedFile {
  const name = fileName(url, index);
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return "";
    }
  })();
  const hls = /\.m3u8(?:$|[?#])/i.test(path);
  const canStream = PLAYABLE_EXT.test(path) || hls;
  const mediaId = putMedia({
    name,
    directUrl: hls ? undefined : url,
    hlsUrl: hls ? url : undefined,
    referer,
    publicDirect: true,
  });
  return {
    id: mediaId,
    name,
    size: 0,
    isDir: false,
    path: "/",
    mimeHint: "video",
    host: "unknown",
    directUrl: hls ? undefined : url,
    hlsUrl: hls ? url : undefined,
    mediaId,
    originalReady: true,
    canStream,
  };
}

async function readLimited(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const dec = new TextDecoder();
  let out = "";
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    out += dec.decode(value, { stream: true });
  }
  try {
    await reader.cancel();
  } catch {
    /* ignore */
  }
  out += dec.decode();
  return out.slice(0, max);
}

async function hostsOk(urls: string[], trustedHost: string): Promise<string[]> {
  const groups = new Map<string, string>();
  for (const raw of urls) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (!groups.has(host)) groups.set(host, raw);
    } catch {
      /* skip */
    }
  }
  const ok = new Set<string>();
  if (trustedHost) ok.add(trustedHost.toLowerCase());
  await Promise.all(
    [...groups.entries()].map(async ([host, sample]) => {
      if (ok.has(host)) return;
      if (await isPublicHttpUrl(sample)) ok.add(host);
    }),
  );
  return urls.filter((raw) => {
    try {
      return ok.has(new URL(raw).hostname.toLowerCase());
    } catch {
      return false;
    }
  });
}

async function mediaFromFrames(html: string, base: string, budgetMs: number): Promise<string[]> {
  const frames = collectPlayerFrames(html, base);
  if (!frames.length) return [];
  const jobs = frames.map(async (src) => {
    const got = await fetchPublic(src, { timeoutMs: budgetMs, referer: base });
    if (!got) return [] as string[];
    const ctype = got.res.headers.get("content-type") || "";
    const finalLooks = (() => {
      try {
        return looksLikeMedia(new URL(got.url));
      } catch {
        return false;
      }
    })();
    const mediaType = /^(video|audio)\//i.test(ctype) || /mpegurl/i.test(ctype);
    if (!/text\/html|application\/xhtml|text\/plain/i.test(ctype) && (mediaType || finalLooks)) {
      try {
        await got.res.body?.cancel();
      } catch {
        /* ignore */
      }
      return mediaType || finalLooks ? [got.url] : [];
    }
    if (ctype && !/text\/html|text\/plain|application\/xhtml/i.test(ctype)) {
      try {
        await got.res.body?.cancel();
      } catch {
        /* ignore */
      }
      return [];
    }
    const nested = await readLimited(got.res, MAX_FRAME_HTML);
    return collectMediaUrls(nested, got.url);
  });
  const timer = new Promise<string[]>((resolve) => setTimeout(() => resolve([]), budgetMs + 400));
  const found = await Promise.race([Promise.all(jobs).then((lists) => lists.flat()), timer]);
  return found;
}

function fail(inputUrl: string, error: string, elapsedMs: number, hint?: string): ResolveResult {
  return { ok: false, host: "unknown", inputUrl, error, hint, elapsedMs };
}

export async function findPublicVideos(raw: string): Promise<ResolveResult> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  const input = normalizePaste(raw);
  if (!input) {
    return fail("", "Paste a link.", 0, "A page address or a direct .mp4 / .webm / .m3u8 link.");
  }
  let page: URL;
  try {
    page = new URL(input);
  } catch {
    return fail(input, "That is not a link.", elapsed(), "Include the full address, starting with https://");
  }
  if (page.protocol !== "https:" && page.protocol !== "http:") {
    return fail(input, "Only web links work.", elapsed(), "Paste an https address.");
  }

  const known = detectHost(page.href);
  if (known === "terabox" || known === "diskwala" || known === "blatim" || known === "telegram") {
    return resolveShare(page.href, "");
  }
  if (isWalledHost(page.hostname)) {
    return fail(
      page.href,
      "That site locks the video inside its own player.",
      elapsed(),
      "Skipper saves files a page publishes directly (.mp4, .webm, .m3u8), including a player frame on the same page. YouTube, Netflix, TikTok and similar apps do not hand the file out. Paste the file link itself, or a TeraBox, Diskwala, or Blatim share on the home page.",
    );
  }
  if (!underLimit()) {
    return fail(page.href, "Slow down a moment.", elapsed(), "Too many page reads at once. Try again in a few seconds.");
  }
  if (!(await isPublicHttpUrl(page.href))) {
    return fail(page.href, "That address is not a public website.", elapsed());
  }

  const got = await fetchPublic(page.href, { timeoutMs: 8000, referer: page.origin });
  if (!got) {
    return fail(
      page.href,
      "Could not open that page.",
      elapsed(),
      "The site did not answer, or the address is not public. If you have the direct video file link, paste that.",
    );
  }

  const ctype = got.res.headers.get("content-type") || "";
  const finalUrl = got.url;
  const htmlLike = /text\/html|application\/xhtml/i.test(ctype);
  const finalLooks = (() => {
    try {
      return looksLikeMedia(new URL(finalUrl));
    } catch {
      return false;
    }
  })();
  const mediaType = /^(video|audio)\//i.test(ctype) || /mpegurl/i.test(ctype);
  if (!htmlLike && (mediaType || (finalLooks && !/xml|json|javascript|html/i.test(ctype)))) {
    if (got.res.status >= 400) {
      try {
        await got.res.body?.cancel();
      } catch {
        /* ignore */
      }
      return fail(
        page.href,
        "The file server refused that link.",
        elapsed(),
        `It answered ${got.res.status}. The file may be private, or it only opens in a browser session.`,
      );
    }
    try {
      await got.res.body?.cancel();
    } catch {
      /* ignore */
    }
    if (!(await isPublicHttpUrl(finalUrl))) {
      return fail(page.href, "That file is not on a public server.", elapsed());
    }
    const file = toFile(finalUrl, 0, page.href);
    return {
      ok: true,
      host: "unknown",
      inputUrl: page.href,
      title: file.name,
      files: [file],
      warnings: [],
      usedCookie: false,
      elapsedMs: elapsed(),
      source: "direct",
    };
  }

  if (finalLooks && got.res.status >= 400) {
    try {
      await got.res.body?.cancel();
    } catch {
      /* ignore */
    }
    return fail(
      page.href,
      "The file server refused that link.",
      elapsed(),
      `It answered ${got.res.status}. The file may be private, or it only opens in a browser session.`,
    );
  }

  if (ctype && !/text\/html|text\/plain|application\/xhtml|xml/i.test(ctype)) {
    try {
      await got.res.body?.cancel();
    } catch {
      /* ignore */
    }
    return fail(
      page.href,
      "That link is not a video or a web page.",
      elapsed(),
      "Paste a page that embeds a video, or a direct .mp4 / .webm / .m3u8 file.",
    );
  }

  const html = await readLimited(got.res, MAX_HTML);
  const titleMatch = html.match(/<title[^>]*>([^<]{1,180})<\/title>/i);
  const title = titleMatch ? decodeTitle(titleMatch[1]) : new URL(finalUrl).hostname;
  let candidates = collectMediaUrls(html, finalUrl);
  const hasFrame = /<(?:iframe|embed)\b/i.test(html);
  if (candidates.length === 0 || hasFrame) {
    const extra = await mediaFromFrames(html, finalUrl, candidates.length === 0 ? 4500 : 1600);
    if (extra.length) candidates = [...candidates, ...extra];
  }

  const trusted = (() => {
    try {
      return new URL(finalUrl).hostname;
    } catch {
      return "";
    }
  })();
  const checked = await hostsOk([...new Set(candidates)], trusted);
  const unique = checked.slice(0, MAX_FILES);
  unique.sort(
    (a, b) =>
      Number(/\.(mp4|webm|m4v|mov)(?:$|[?#])/i.test(b)) - Number(/\.(mp4|webm|m4v|mov)(?:$|[?#])/i.test(a)),
  );

  if (!unique.length) {
    const embedded = /youtube\.com|youtu\.be|player\.vimeo|tiktok\.com|dailymotion\.com/i.test(html);
    return fail(
      page.href,
      embedded ? "This page only embeds a locked player." : "No public video file on that page.",
      elapsed(),
      embedded
        ? "The video plays inside YouTube or a similar app. Skipper can save it only when the page itself publishes an .mp4, .webm, or .m3u8 file."
        : "Many sites hide the file behind a login. Paste the direct video link if you have it. One page is one page — not every private file on an account.",
    );
  }

  const files = unique.map((url, i) => toFile(url, i, finalUrl));
  const zipFiles = files.filter((f) => f.directUrl && f.mediaId);
  const packId =
    zipFiles.length > 1
      ? putPack(
          title || "videos",
          zipFiles.map((f) => ({ name: f.name, mediaId: f.mediaId!, size: f.size })),
        )
      : undefined;

  const warnings = [
    "Only the public video files on this page. Other files on the same account stay private.",
  ];
  if (candidates.length > unique.length) warnings.push("Some links were skipped because they are not public video files.");
  if (html.length >= MAX_HTML) warnings.push("The page was very large. Showing the videos found in the first part.");
  if (files.length >= MAX_FILES) warnings.push("Stopped at 30 videos so the phone stays quick.");

  return {
    ok: true,
    host: "unknown",
    inputUrl: page.href,
    title: title || new URL(finalUrl).hostname,
    files,
    warnings,
    usedCookie: false,
    elapsedMs: elapsed(),
    source: "page",
    packId,
  };
}
