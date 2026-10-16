/**
 * No-login original file via public resolvers that keep their own cookie pool.
 * Proven 2026-09-23 / still live 2026-10: POST https://www.teraboxdl.site/api/proxy
 *   TeraBox  → dl-worker.teraboxdl.site?token=…  (video/mp4, Range 206, CORS *)
 *   Diskwala → cdns*.diskwala.com / S3 when the worker still answers
 * Sequential www → apex (never race — parallel POSTs rate-limit the first paste).
 */

import { teraboxCandidateUrls } from "./parse-url";
import { MEDIA_UA } from "./cdn";
import { learnedFolderWalk, learnedProxyPath, orderByHealth, record } from "./engine";

type Resolver = {
  name: string;
  url: string;
  origin: string;
  method: "POST" | "GET";
  timeoutMs?: number;
};

const ROBIN: Resolver = {
  name: "robin-worker",
  url: "https://terabox-worker.robinkumarshakya103.workers.dev/api",
  origin: "https://terabox-worker.robinkumarshakya103.workers.dev",
  method: "GET",
  timeoutMs: 7000,
};

function teraboxResolvers(): Resolver[] {
  const path = learnedProxyPath();
  const list: Resolver[] = [
    {
      name: "teraboxdl.site",
      url: `https://www.teraboxdl.site${path}`,
      origin: "https://www.teraboxdl.site",
      method: "POST",
      timeoutMs: 12000,
    },
  ];
  if (path !== "/api/proxy") {
    list.push({
      name: "teraboxdl.site-legacy",
      url: "https://www.teraboxdl.site/api/proxy",
      origin: "https://www.teraboxdl.site",
      method: "POST",
      timeoutMs: 12000,
    });
  }
  list.push({
    name: "teraboxdl.site-apex",
    url: `https://teraboxdl.site${path}`,
    origin: "https://teraboxdl.site",
    method: "POST",
    timeoutMs: 12000,
  });
  list.push(ROBIN);
  return list;
}

function diskwalaResolvers(): Resolver[] {
  const path = learnedProxyPath();
  return [
    {
      name: "teraboxdl.site",
      url: `https://www.teraboxdl.site${path}`,
      origin: "https://www.teraboxdl.site",
      method: "POST",
      timeoutMs: 8000,
    },
    {
      name: "teraboxdl.site-apex",
      url: `https://teraboxdl.site${path}`,
      origin: "https://teraboxdl.site",
      method: "POST",
      timeoutMs: 8000,
    },
  ];
}

export type PublicFile = {
  name: string;
  size: number;
  fsId?: string;
  shareId?: string;
  uk?: string;
  thumbnail?: string;
  duration?: number;
  directUrl?: string;
  hlsUrl?: string;
  md5?: string;
};

export type PublicResolve =
  | { ok: true; title: string; files: PublicFile[]; source: string; truncated?: boolean }
  | { ok: false; error: string };

const CACHE_TTL_MS = 45_000;
const cache = new Map<string, { at: number; value: PublicResolve }>();

function asHttp(u: unknown): string | undefined {
  return typeof u === "string" && /^https?:\/\//i.test(u) ? u : undefined;
}

function isSharePage(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (/\.(mp4|mkv|webm|mov|m4v|mp3|m3u8|ts)(\?|$)/i.test(path) || u.searchParams.has("token")) {
      return false;
    }
    return /\/(s|sharing|app|playlist|creator|watch)\b/i.test(path);
  } catch {
    return true;
  }
}

function pickHls(it: Record<string, unknown>): string | undefined {
  const candidates = [it.m3u8, it.m3u8_url, it.hls, it.hls_url, it.master_m3u8, it.stream_url, it.streaming_url];
  return candidates.find(
    (u): u is string => typeof u === "string" && /^https?:\/\//i.test(u) && /m3u8|mpegurl|get_m3u8/i.test(u),
  );
}

function pickDirect(it: Record<string, unknown>): string | undefined {
  const keys = [
    "direct_link",
    "download_link",
    "dlink",
    "original_download_url",
    "download_url",
    "stream_download_url",
    "cdn_url",
    "play_url",
    "video_url",
    "url",
  ];
  for (const k of keys) {
    const u = asHttp(it[k]);
    if (u && !isSharePage(u)) return u;
  }
  const stream = asHttp(it.stream_url);
  if (stream && !/m3u8|mpegurl|get_m3u8/i.test(stream) && !isSharePage(stream)) return stream;
  return undefined;
}

function parseSize(raw: unknown): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  if (typeof raw === "string") {
    const m = raw.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
    if (m) {
      const v = Number(m[1]);
      const u = m[2].toUpperCase();
      if (u === "GB") return Math.round(v * 1e9);
      if (u === "MB") return Math.round(v * 1e6);
      if (u === "KB") return Math.round(v * 1e3);
      return Math.round(v);
    }
  }
  return 0;
}

function fromProxyItem(it: Record<string, unknown>, json: Record<string, unknown>): PublicFile | null {
  const name = String(it.server_filename || it.filename || it.file_name || it.name || it.title || json.title || "");
  const directUrl = pickDirect(it);
  if (!name && !directUrl) return null;
  if (Number(it.isdir) === 1 || it.is_dir === true) return null;
  const thumbs =
    (it.thumbs as { url3?: string; url2?: string; url1?: string; icon?: string } | undefined) ?? {};
  const size = parseSize(it.size ?? it.size_bytes ?? it.sizebytes ?? it.file_size);
  return {
    name: name || "file",
    size,
    fsId: it.fs_id != null ? String(it.fs_id) : it.fid != null ? String(it.fid) : it.file_id != null ? String(it.file_id) : undefined,
    shareId:
      json.share_id != null
        ? String(json.share_id)
        : json.shareid != null
          ? String(json.shareid)
          : it.shareid != null
            ? String(it.shareid)
            : undefined,
    uk: json.uk != null ? String(json.uk) : it.uk != null ? String(it.uk) : undefined,
    thumbnail: thumbs.url3 || thumbs.url2 || thumbs.url1 || asHttp(it.thumbnail) || asHttp(it.thumb),
    duration: it.duration != null ? Number(it.duration) : undefined,
    directUrl,
    hlsUrl: pickHls(it),
    md5: typeof it.md5 === "string" ? it.md5 : undefined,
  };
}

function unwrapPayload(json: Record<string, unknown>): Record<string, unknown> {
  const data = json.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    return { ...json, ...d, data: json.data };
  }
  return json;
}

function filesFromJson(json: Record<string, unknown>): PublicFile[] {
  const payload = unwrapPayload(json);
  const rawUnknown =
    payload.list ?? payload.files ?? payload.fileInfo ?? payload.file_info ?? payload.data ?? payload.result;
  const raw: Record<string, unknown>[] = Array.isArray(rawUnknown)
    ? (rawUnknown as Record<string, unknown>[])
    : rawUnknown && typeof rawUnknown === "object"
      ? [rawUnknown as Record<string, unknown>]
      : payload.direct_link || payload.dlink || payload.url
        ? [payload]
        : [];
  return raw.map((it) => fromProxyItem(it, payload)).filter((f): f is PublicFile => Boolean(f));
}

async function callResolver(
  r: Resolver,
  shareUrl: string,
  extra?: { dir?: string; page?: number },
): Promise<{ json: Record<string, unknown> } | { error: string }> {
  const target = r.method === "GET" ? `${r.url}?url=${encodeURIComponent(shareUrl)}` : r.url;
  const body: Record<string, unknown> = { url: shareUrl, link: shareUrl };
  if (extra?.dir) body.dir = extra.dir;
  if (extra?.page && extra.page > 1) body.page = extra.page;
  const res = await fetch(target, {
    method: r.method,
    headers: {
      "user-agent": MEDIA_UA,
      accept: "application/json",
      origin: r.origin,
      referer: `${r.origin}/`,
      ...(r.method === "POST" ? { "content-type": "application/json" } : {}),
    },
    body: r.method === "POST" ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(r.timeoutMs ?? 18000),
  });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: `${r.name} returned non-JSON (${res.status}).` };
  }
  const errno = typeof json.errno === "number" ? json.errno : undefined;
  const detail = json.detail;
  if (
    !res.ok ||
    (errno !== undefined && errno !== 0) ||
    json.error ||
    json.success === false ||
    (typeof detail === "string" && /not found/i.test(detail))
  ) {
    return {
      error: String(json.error || json.errmsg || json.detail || `${r.name} errno ${json.errno ?? res.status}`),
    };
  }
  return { json };
}

async function tryResolver(r: Resolver, shareUrl: string): Promise<Extract<PublicResolve, { ok: true }>> {
  const got = await callResolver(r, shareUrl);
  if ("error" in got) throw new Error(got.error);
  const files = filesFromJson(got.json);
  if (!files.length) throw new Error(`${r.name} listed no files.`);
  if (!files.some((f) => f.directUrl || f.hlsUrl)) {
    throw new Error(`${r.name} listed files but no media URL.`);
  }
  return {
    ok: true,
    title: String(got.json.title || files[0].name).replace(/^\/+/, ""),
    files,
    source: r.name,
  };
}

function candidateUrls(shareUrl: string, kind?: "terabox" | "diskwala"): string[] {
  if (kind === "diskwala") {
    // One id, one URL — callers already try /app vs /playlist. Don't multiply skip-site hangs.
    return [shareUrl];
  }
  return teraboxCandidateUrls(shareUrl);
}

export async function resolveTeraboxPublic(
  shareUrl: string,
  opts: { kind?: "terabox" | "diskwala" } = {},
): Promise<PublicResolve> {
  const kind = opts.kind ?? "terabox";
  const cacheKey = `${kind}:${shareUrl.trim()}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const list = orderByHealth(kind, kind === "diskwala" ? diskwalaResolvers() : teraboxResolvers());
  const urls = candidateUrls(shareUrl, kind);
  let lastError = "No public resolver answered.";

  for (const url of urls) {
    for (const r of list) {
      const started = Date.now();
      try {
        const ok = await tryResolver(r, url);
        record(kind, r.name, true, Date.now() - started, ok.title);
        cache.set(cacheKey, { at: Date.now(), value: ok });
        return ok;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        record(kind, r.name, false, Date.now() - started, lastError);
      }
    }
  }
  return { ok: false, error: lastError };
}

type ProxyListing = {
  title: string;
  files: PublicFile[];
  folders: string[];
  hasMore: boolean;
};

function listingFromJson(json: Record<string, unknown>): ProxyListing {
  const payload = unwrapPayload(json);
  const rawUnknown =
    payload.list ?? payload.files ?? payload.fileInfo ?? payload.file_info ?? payload.data ?? payload.result;
  const raw: Record<string, unknown>[] = Array.isArray(rawUnknown)
    ? (rawUnknown as Record<string, unknown>[])
    : rawUnknown && typeof rawUnknown === "object"
      ? [rawUnknown as Record<string, unknown>]
      : [];
  const folders: string[] = [];
  const fileItems: Record<string, unknown>[] = [];
  for (const it of raw) {
    if (Number(it.isdir) === 1 || it.is_dir === true) {
      const path = typeof it.path === "string" ? it.path : "";
      if (path && path !== "/") folders.push(path);
      continue;
    }
    fileItems.push(it);
  }
  const files = fileItems.map((it) => fromProxyItem(it, payload)).filter((f): f is PublicFile => Boolean(f));
  return {
    title: String(payload.title || files[0]?.name || "TeraBox share").replace(/^\/+/, ""),
    files,
    folders,
    hasMore: payload.has_more === true,
  };
}

/**
 * Folder Pack only. Pages the public share the worker actually publishes
 * (`dir` + `page` + `has_more`). Never asks for a parent folder — a bad dir
 * comes back as "expired" and must not wipe the root listing. A private
 * account is not listable from one share.
 */
export async function walkTeraboxPublic(shareUrl: string): Promise<PublicResolve> {
  if (!learnedFolderWalk()) return resolveTeraboxPublic(shareUrl, { kind: "terabox" });

  const started = Date.now();
  const MAX_FILES = 60;
  const MAX_DIRS = 12;
  const MAX_PAGES = 4;
  const MAX_MS = 16000;
  const resolvers = orderByHealth("terabox", teraboxResolvers()).filter((r) => r.method === "POST");
  const urls = teraboxCandidateUrls(shareUrl);
  let lastError = "No public resolver answered.";
  let root: { r: Resolver; url: string; listing: ProxyListing } | null = null;

  for (const url of urls) {
    for (const r of resolvers) {
      const t0 = Date.now();
      const got = await callResolver(r, url);
      if ("error" in got) {
        lastError = got.error;
        record("terabox", r.name, false, Date.now() - t0, lastError);
        continue;
      }
      const listing = listingFromJson(got.json);
      const playable = listing.files.some((f) => f.directUrl || f.hlsUrl);
      if (!playable && !listing.folders.length) {
        lastError = `${r.name} listed no playable files.`;
        record("terabox", r.name, false, Date.now() - t0, lastError);
        continue;
      }
      record("terabox", r.name, true, Date.now() - t0, listing.title);
      root = { r, url, listing };
      break;
    }
    if (root) break;
  }
  if (!root) return { ok: false, error: lastError };

  const files: PublicFile[] = [];
  const seen = new Set<string>();
  const add = (list: PublicFile[]) => {
    for (const f of list) {
      if (!f.directUrl && !f.hlsUrl) continue;
      if (files.length >= MAX_FILES) return;
      const key = f.fsId || f.directUrl || f.hlsUrl || `${f.name}:${f.size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(f);
    }
  };
  add(root.listing.files);

  let truncated = files.length >= MAX_FILES;
  const queue: Array<{ dir: string; depth: number }> = [];
  const seenDirs = new Set<string>();
  const enqueue = (dirs: string[], depth: number) => {
    if (depth > 3) return;
    for (const dir of dirs) {
      if (!dir || seenDirs.has(dir) || queue.length >= MAX_DIRS) continue;
      queue.push({ dir, depth });
    }
  };
  enqueue(root.listing.folders, 1);

  let page = 1;
  let more = root.listing.hasMore;
  while (more && page < MAX_PAGES && files.length < MAX_FILES && Date.now() - started < MAX_MS) {
    page += 1;
    const got = await callResolver(root.r, root.url, { page });
    if ("error" in got) {
      truncated = true;
      break;
    }
    const listing = listingFromJson(got.json);
    add(listing.files);
    enqueue(listing.folders, 1);
    more = listing.hasMore && (listing.files.length > 0 || listing.folders.length > 0);
  }
  if (more) truncated = true;

  let dirs = 0;
  while (queue.length && dirs < MAX_DIRS && files.length < MAX_FILES && Date.now() - started < MAX_MS) {
    const job = queue.shift();
    if (!job || seenDirs.has(job.dir)) continue;
    seenDirs.add(job.dir);
    dirs += 1;
    let folderPage = 1;
    let folderMore = true;
    while (folderMore && folderPage <= MAX_PAGES && files.length < MAX_FILES && Date.now() - started < MAX_MS) {
      const got = await callResolver(root.r, root.url, { dir: job.dir, page: folderPage });
      if ("error" in got) {
        truncated = true;
        break;
      }
      const listing = listingFromJson(got.json);
      add(listing.files);
      enqueue(listing.folders, job.depth + 1);
      folderMore = listing.hasMore && (listing.files.length > 0 || listing.folders.length > 0);
      if (!folderMore) break;
      folderPage += 1;
    }
    if (folderMore) truncated = true;
  }
  if ((queue.length || more) && files.length >= MAX_FILES) truncated = true;
  if (!files.length) return { ok: false, error: lastError };

  return {
    ok: true,
    title: root.listing.title || files[0].name,
    files,
    source: root.r.name,
    truncated,
  };
}
