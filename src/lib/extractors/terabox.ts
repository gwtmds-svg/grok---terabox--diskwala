import { createHash } from "node:crypto";
import type { ResolveResult, ResolvedFile } from "./types";
import { extractTeraSurl } from "./parse-url";
import { resolveTeraboxPublic } from "./terabox-public";
import { putMedia, refererFor } from "./media-cache";
import { MEDIA_UA } from "./cdn";

const APP_ID = "250528";
const ORIGINS = [
  "https://www.1024tera.com",
  "https://www.terabox.app",
  "https://www.terabox.com",
] as const;

const HLS_TYPES = [
  "M3U8_AUTO_720",
  "M3U8_AUTO_480",
  "M3U8_FLV_264_480",
  "M3U8_AUTO_360",
  "M3U8_FLV_264_360",
];

type TeraListItem = {
  category?: string;
  fs_id: string | number;
  isdir: string | number;
  path: string;
  server_filename: string;
  size: string | number;
  md5?: string;
  thumbs?: { url1?: string; url2?: string; url3?: string; icon?: string };
  width?: number;
  height?: number;
  duration?: number;
  dlink?: string;
};

type TeraListJson = {
  errno: number;
  errmsg?: string;
  show_msg?: string;
  title?: string;
  share_id?: number | string;
  shareid?: number | string;
  uk?: number | string;
  uk_str?: string;
  sign?: string;
  timestamp?: number | string;
  list?: TeraListItem[];
};

type NativeOpen = {
  list: TeraListJson;
  cookie: string;
  jsToken: string;
  origin: string;
};

function cookieHeaderFromResponse(res: Response): string {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const pairs = raw.map((c) => c.split(";")[0]).filter(Boolean);
  return pairs.join("; ");
}

function mergeCookie(a: string, b: string): string {
  const map = new Map<string, string>();
  for (const part of `${a}; ${b}`.split(";")) {
    const trimmed = part.trim();
    if (!trimmed || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function extractJsToken(html: string): string {
  const encoded = html.match(/fn%28%22([A-F0-9]{32,})%22/);
  if (encoded?.[1]) return encoded[1];
  const plain = html.match(/fn\("([A-F0-9]{32,})"\)/);
  if (plain?.[1]) return plain[1];
  const assigned = html.match(/jsToken["'\s:=]+["']([A-F0-9]{32,})/);
  if (assigned?.[1]) return assigned[1];
  const snippet = html.match(/decodeURIComponent\(`([^`]+)`\)/);
  if (snippet?.[1]) {
    try {
      const decoded = decodeURIComponent(snippet[1]);
      const m = decoded.match(/fn\("([A-F0-9]{32,})"\)/);
      if (m?.[1]) return m[1];
    } catch {
      /* ignore malformed percent-encoding */
    }
  }
  return "";
}

function extractPcfToken(html: string): string {
  return html.match(/"pcftoken"\s*:\s*"([^"]+)"/)?.[1] ?? "";
}

async function fetchText(
  url: string,
  init: { cookie?: string; referer?: string; method?: string; body?: string } = {},
): Promise<{ status: number; text: string; cookie: string; json: unknown }> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      "user-agent": MEDIA_UA,
      accept: "application/json,text/html,*/*",
      referer: init.referer ?? `${ORIGINS[0]}/`,
      cookie: init.cookie ?? "",
      ...(init.body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init.body,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, text, cookie: cookieHeaderFromResponse(res), json };
}

function mimeHint(name: string, isDir: boolean, category?: string): ResolvedFile["mimeHint"] {
  if (isDir) return "folder";
  if (category === "1") return "video";
  if (category === "2") return "audio";
  if (category === "3") return "image";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mkv", "avi", "mov", "webm", "flv", "m4v", "ts"].includes(ext)) return "video";
  if (["mp3", "flac", "wav", "aac", "m4a", "ogg"].includes(ext)) return "audio";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return "image";
  return "file";
}

function attachMedia(file: ResolvedFile): ResolvedFile {
  if (file.directUrl || file.hlsUrl) {
    file.mediaId = putMedia({
      name: file.name,
      directUrl: file.directUrl,
      hlsUrl: file.hlsUrl,
      referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.teraboxdl.site/"),
    });
  }
  return file;
}

function toFile(
  item: TeraListItem,
  ctx: { shareId: string; uk: string; surl: string; shareSign?: string; shareTimestamp?: string },
): ResolvedFile {
  const isDir = String(item.isdir) === "1";
  const name = item.server_filename || item.path.split("/").pop() || "file";
  const hint = mimeHint(name, isDir, item.category);
  return {
    id: String(item.fs_id),
    name,
    size: Number(item.size) || 0,
    isDir,
    path: item.path,
    mimeHint: hint,
    thumbnail: item.thumbs?.url3 || item.thumbs?.url2 || item.thumbs?.url1,
    duration: item.duration ? Number(item.duration) : undefined,
    width: item.width,
    height: item.height,
    md5: item.md5,
    fsId: String(item.fs_id),
    shareId: ctx.shareId,
    uk: ctx.uk,
    surl: ctx.surl,
    shareSign: ctx.shareSign,
    shareTimestamp: ctx.shareTimestamp,
    host: "terabox",
    directUrl: item.dlink || undefined,
    hlsUrl: undefined,
    originalReady: Boolean(item.dlink),
    canStream: !isDir && (hint === "video" || hint === "audio"),
  };
}

function asList(json: unknown): TeraListJson | null {
  if (!json || typeof json !== "object") return null;
  const row = json as TeraListJson;
  if (typeof row.errno === "number" && row.errno !== 0) return null;
  if (!Array.isArray(row.list) || !row.list.length) return null;
  if (row.share_id == null && row.shareid != null) row.share_id = row.shareid;
  if (row.uk == null && row.uk_str != null) row.uk = row.uk_str;
  return row;
}

function listParams(surl: string, extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams({
    app_id: APP_ID,
    shorturl: surl,
    root: extra.dir ? "0" : "1",
    scene: "",
    web: "1",
    page: "1",
    num: "100",
    channel: "dubox",
    clienttype: "0",
    ...extra,
  });
  return p;
}

async function listDir(
  origin: string,
  surl: string,
  cookie: string,
  jsToken: string,
  pcfToken: string,
  dir?: string,
  page = 1,
): Promise<TeraListJson> {
  const u = new URL(`${origin}/share/list`);
  u.search = listParams(surl, {
    ...(dir ? { dir, root: "0" } : {}),
    ...(jsToken ? { jsToken } : {}),
    ...(pcfToken ? { pcftoken: pcfToken } : {}),
    page: String(page),
  }).toString();
  const { json } = await fetchText(u.toString(), {
    cookie,
    referer: `${origin}/sharing/link?surl=${surl}`,
  });
  return (json ?? { errno: -1 }) as TeraListJson;
}

async function listPages(
  origin: string,
  surl: string,
  cookie: string,
  jsToken: string,
  pcfToken: string,
  dir?: string,
): Promise<TeraListItem[]> {
  const out: TeraListItem[] = [];
  for (let page = 1; page <= 3; page++) {
    const listed = await listDir(origin, surl, cookie, jsToken, pcfToken, dir, page);
    if (listed.errno !== 0 || !listed.list?.length) break;
    out.push(...listed.list);
    if (listed.list.length < 100) break;
  }
  return out;
}

async function shortUrlInfo(
  origin: string,
  surl: string,
  cookie: string,
  jsToken: string,
): Promise<TeraListJson> {
  const variants = [surl, /^1[\w-]/.test(surl) ? surl.slice(1) : `1${surl}`];
  for (const shorturl of variants) {
    const u = new URL(`${origin}/api/shorturlinfo`);
    u.search = listParams(shorturl, {
      ...(jsToken ? { jsToken } : {}),
    }).toString();
    const { json } = await fetchText(u.toString(), {
      cookie,
      referer: `${origin}/sharing/link?surl=${surl.replace(/^1/, "")}`,
    });
    const list = asList(json);
    if (list) return list;
  }
  return { errno: -1 };
}

async function expandFolders(
  origin: string,
  surl: string,
  cookie: string,
  jsToken: string,
  pcfToken: string,
  items: TeraListItem[],
  depth = 0,
): Promise<TeraListItem[]> {
  const MAX_FILES = 60;
  const out: TeraListItem[] = [];
  for (const item of items) {
    if (out.length >= MAX_FILES) break;
    if (String(item.isdir) === "1" && depth < 3) {
      try {
        const nested = await listPages(origin, surl, cookie, jsToken, pcfToken, item.path);
        if (nested.length) {
          const kids = await expandFolders(origin, surl, cookie, jsToken, pcfToken, nested, depth + 1);
          out.push(...kids);
        }
      } catch {
        /* share/list may 400141 — keep going */
      }
    } else {
      out.push(item);
    }
  }
  return out.slice(0, MAX_FILES);
}

function parentDir(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return "";
  parts.pop();
  return `/${parts.join("/")}`;
}

/** If the link opens one file inside a shared folder, list that folder too. */
async function widenShare(
  origin: string,
  surl: string,
  cookie: string,
  jsToken: string,
  pcfToken: string,
  items: TeraListItem[],
): Promise<TeraListItem[]> {
  if (items.length !== 1 || String(items[0].isdir) === "1") return items;
  const parent = parentDir(items[0].path || "");
  if (!parent) return items;
  try {
    const sibs = await listPages(origin, surl, cookie, jsToken, pcfToken, parent);
    if (sibs.length > 1) return sibs;
  } catch {
    /* parent folder is outside this public share */
  }
  return items;
}

async function openOrigin(origin: string, surl: string, extraCookie: string): Promise<NativeOpen> {
  const pageUrl = `${origin}/sharing/link?surl=${surl}`;
  const page = await fetchText(pageUrl, { cookie: extraCookie, referer: `${origin}/` });
  const cookie = mergeCookie(page.cookie, extraCookie);
  const jsToken = extractJsToken(page.text);
  const pcfToken = extractPcfToken(page.text);

  const info = await shortUrlInfo(origin, surl, cookie, jsToken);
  if (info.errno === 0 && info.list?.length) {
    const seeded = await widenShare(origin, surl, cookie, jsToken, pcfToken, info.list);
    const items = await expandFolders(origin, surl, cookie, jsToken, pcfToken, seeded);
    return { list: { ...info, list: items }, cookie, jsToken, origin };
  }

  const listed = await listDir(origin, surl, cookie, jsToken, pcfToken);
  if (listed.errno === 0 && listed.list?.length) {
    const seeded = await widenShare(origin, surl, cookie, jsToken, pcfToken, listed.list);
    const items = await expandFolders(origin, surl, cookie, jsToken, pcfToken, seeded);
    return {
      list: {
        ...listed,
        sign: listed.sign || info.sign,
        timestamp: listed.timestamp || info.timestamp,
        share_id: listed.share_id || listed.shareid || info.share_id || info.shareid,
        uk: listed.uk || info.uk,
        list: items,
      },
      cookie,
      jsToken,
      origin,
    };
  }

  const errno = listed.errno || info.errno || -1;
  const msg = listed.errmsg || listed.show_msg || info.errmsg || `errno ${errno}`;
  throw new Error(msg);
}

async function openNative(surl: string, extraCookie: string): Promise<NativeOpen> {
  const errors: string[] = [];
  for (const origin of ORIGINS) {
    try {
      return await Promise.race([
        openOrigin(origin, surl, extraCookie),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]);
    } catch (err) {
      errors.push(`${new URL(origin).host}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(errors.join(" · ") || "all TeraBox origins failed");
}

export function teraboxStreamSign(uk: string, shareId: string, fid: string, timestamp: number): string {
  return createHash("sha1").update(`${uk}${shareId}${fid}${timestamp}`).digest("hex");
}

export function teraboxStreamUrl(
  file: Pick<ResolvedFile, "uk" | "shareId" | "fsId" | "shareSign" | "shareTimestamp">,
  type = "M3U8_AUTO_480",
  origin: string = ORIGINS[0],
): string | null {
  if (!file.uk || !file.shareId || !file.fsId) return null;
  const ts = file.shareTimestamp ? Number(file.shareTimestamp) : Math.floor(Date.now() / 1000);
  const sign =
    file.shareSign || teraboxStreamSign(file.uk, file.shareId, file.fsId, Number.isFinite(ts) ? ts : Math.floor(Date.now() / 1000));
  const u = new URL(`${origin}/share/streaming`);
  u.searchParams.set("uk", file.uk);
  u.searchParams.set("shareid", file.shareId);
  u.searchParams.set("type", type);
  u.searchParams.set("fid", file.fsId);
  u.searchParams.set("sign", sign);
  u.searchParams.set("timestamp", String(Number.isFinite(ts) ? ts : Math.floor(Date.now() / 1000)));
  u.searchParams.set("app_id", APP_ID);
  u.searchParams.set("channel", "dubox");
  u.searchParams.set("clienttype", "0");
  u.searchParams.set("web", "1");
  return u.toString();
}

export async function fetchTeraboxPlaylist(
  uk: string,
  shareId: string,
  fid: string,
  type = "M3U8_AUTO_480",
  extra?: Pick<ResolvedFile, "shareSign" | "shareTimestamp">,
): Promise<{ playlist: string; streamUrl: string } | { error: string }> {
  const types = [type, ...HLS_TYPES.filter((t) => t !== type)];
  for (const origin of ORIGINS) {
    for (const t of types) {
      const streamUrl = teraboxStreamUrl({ uk, shareId, fsId: fid, shareSign: extra?.shareSign, shareTimestamp: extra?.shareTimestamp }, t, origin);
      if (!streamUrl) continue;
      const { text, json } = await fetchText(streamUrl, { referer: `${origin}/` });
      if (typeof json === "object" && json && "errno" in json && (json as { errno: number }).errno !== 0) {
        continue;
      }
      if (text.includes("#EXTM3U")) return { playlist: text, streamUrl };
    }
  }
  return { error: "No HLS playlist is available for this file yet (transcode pending or blocked)." };
}

export async function fetchTeraboxDlink(opts: {
  uk: string;
  shareId: string;
  fsId: string;
  cookie: string;
  jsToken?: string;
  origin?: string;
  sign?: string;
  timestamp?: string;
}): Promise<string | null> {
  if (!opts.cookie.includes("ndus=")) return null;
  const origin = opts.origin || ORIGINS[0];

  const sharedownload = async () => {
    const u = new URL(`${origin}/api/sharedownload`);
    u.searchParams.set("app_id", APP_ID);
    u.searchParams.set("channel", "dubox");
    u.searchParams.set("clienttype", "0");
    u.searchParams.set("web", "1");
    if (opts.jsToken) u.searchParams.set("jsToken", opts.jsToken);
    const body = new URLSearchParams({
      product: "share",
      uk: opts.uk,
      primaryid: opts.shareId,
      fid_list: JSON.stringify([Number(opts.fsId)]),
    });
    const { json } = await fetchText(u.toString(), {
      method: "POST",
      body: body.toString(),
      cookie: opts.cookie,
      referer: `${origin}/`,
    });
    const data = json as { errno?: number; dlink?: string; list?: Array<{ dlink?: string }> } | null;
    return data?.list?.[0]?.dlink ?? data?.dlink ?? null;
  };

  const shareDownload = async () => {
    if (!opts.sign || !opts.timestamp) return null;
    const u = new URL(`${origin}/share/download`);
    u.searchParams.set("app_id", APP_ID);
    u.searchParams.set("channel", "dubox");
    u.searchParams.set("clienttype", "0");
    u.searchParams.set("web", "1");
    u.searchParams.set("uk", opts.uk);
    u.searchParams.set("shareid", opts.shareId);
    u.searchParams.set("sign", opts.sign);
    u.searchParams.set("timestamp", opts.timestamp);
    if (opts.jsToken) u.searchParams.set("jsToken", opts.jsToken);
    const body = new URLSearchParams({
      product: "share",
      fid_list: JSON.stringify([Number(opts.fsId)]),
      primaryid: opts.shareId,
      uk: opts.uk,
    });
    const { json } = await fetchText(u.toString(), {
      method: "POST",
      body: body.toString(),
      cookie: opts.cookie,
      referer: `${origin}/`,
    });
    const data = json as { errno?: number; dlink?: string; list?: Array<{ dlink?: string }> } | null;
    return data?.list?.[0]?.dlink ?? data?.dlink ?? null;
  };

  return (await sharedownload()) || (await shareDownload());
}

function hintForNativeError(message: string): string {
  if (/400141|need verify/i.test(message)) {
    return "TeraBox is asking the native page to verify. Skipper still tries the public original-file worker — paste again in a couple of seconds if this keeps failing.";
  }
  if (/-9|password|pwd|extract/i.test(message)) {
    return "This share looks password-protected. Skipper cannot open locked TeraBox folders yet.";
  }
  if (/400210|login/i.test(message)) {
    return "TeraBox rate-limited the anonymous session. The public worker usually still has the original file.";
  }
  return message;
}

export async function resolveTerabox(rawUrl: string, extraCookie = ""): Promise<ResolveResult> {
  const started = Date.now();
  const surl = extractTeraSurl(rawUrl);
  if (!surl) {
    return {
      ok: false,
      host: "terabox",
      inputUrl: rawUrl,
      error: "Could not read a TeraBox share code from that URL.",
      hint: "Use a link like https://1024tera.com/s/…, https://teraboxshare.com/s/… or https://teraboxlinke.com/v/… — every 2026 mirror is accepted.",
      elapsedMs: Date.now() - started,
    };
  }

  const publicP = resolveTeraboxPublic(rawUrl, { kind: "terabox" });
  const nativeP = openNative(surl, extraCookie).then(
    (v) => v,
    () => null as NativeOpen | null,
  );

  const pub = await publicP;
  let native: NativeOpen | null = null;
  if (pub.ok) {
    native = await Promise.race([
      nativeP,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
  } else {
    native = await nativeP;
  }

  const pubFail = pub.ok ? "" : pub.error;
  const list = native?.list && native.list.errno === 0 ? native.list : undefined;

  if (list?.list?.length) {
    const shareId = String(list.share_id ?? list.shareid ?? "");
    const uk = String(list.uk ?? list.uk_str ?? "");
    const shareSign = list.sign ? String(list.sign) : undefined;
    const shareTimestamp = list.timestamp != null ? String(list.timestamp) : undefined;
    const items = list.list ?? [];
    const files = items.map((it) => toFile(it, { shareId, uk, surl, shareSign, shareTimestamp }));

    if (extraCookie.includes("ndus=") && native) {
      await Promise.all(
        files
          .filter((f) => !f.isDir && !f.directUrl)
          .slice(0, 8)
          .map(async (f) => {
            if (!f.fsId) return;
            const dlink = await fetchTeraboxDlink({
              uk,
              shareId,
              fsId: f.fsId,
              cookie: native.cookie,
              jsToken: native.jsToken,
              origin: native.origin,
              sign: shareSign,
              timestamp: shareTimestamp,
            });
            if (dlink) {
              f.directUrl = dlink;
              f.originalReady = true;
              f.canStream = true;
            }
          }),
      );
    }

    if (pub.ok) {
      for (const f of files) {
        const match =
          pub.files.find((p) => p.fsId && p.fsId === f.fsId) ||
          pub.files.find((p) => p.name === f.name) ||
          (pub.files.length === 1 ? pub.files[0] : undefined);
        if (!match) continue;
        if (match.directUrl) {
          f.directUrl = match.directUrl;
          f.originalReady = true;
        }
        if (match.hlsUrl) f.hlsUrl = match.hlsUrl;
        if (match.thumbnail && !f.thumbnail) f.thumbnail = match.thumbnail;
        if (match.duration && !f.duration) f.duration = match.duration;
        if (match.size && !f.size) f.size = match.size;
        f.canStream = f.canStream || Boolean(match.directUrl || match.hlsUrl);
      }
    }

    for (const f of files) attachMedia(f);

    const warnings: string[] = [];
    if (files.some((f) => f.originalReady)) {
      warnings.push(
        pub.ok
          ? `Original file is ready via ${pub.source} — Play streams the full upload, Download saves the original bytes.`
          : "Original file is ready from the TeraBox session.",
      );
    } else {
      warnings.push(
        pubFail
          ? `Could not mint an original file URL (${pubFail}). Play may only have the official transcode.`
          : "Original file link is still warming up — Skipper will retry the public worker automatically.",
      );
    }

    return {
      ok: true,
      host: "terabox",
      inputUrl: rawUrl,
      title: (list.title || files[0]?.name || "TeraBox share").replace(/^\/+/, ""),
      files,
      warnings,
      usedCookie: extraCookie.includes("ndus="),
      elapsedMs: Date.now() - started,
      source: pub.ok ? pub.source : extraCookie.includes("ndus=") ? "ndus" : "shorturlinfo",
    };
  }

  if (pub.ok) {
    const files: ResolvedFile[] = pub.files.map((p) =>
      attachMedia({
        id: p.fsId || p.name,
        name: p.name,
        size: p.size,
        isDir: false,
        path: `/${p.name}`,
        mimeHint: "video",
        thumbnail: p.thumbnail,
        duration: p.duration,
        md5: p.md5,
        fsId: p.fsId,
        shareId: p.shareId,
        uk: p.uk,
        surl,
        host: "terabox",
        directUrl: p.directUrl,
        hlsUrl: p.hlsUrl,
        originalReady: Boolean(p.directUrl),
        canStream: Boolean(p.directUrl || p.hlsUrl),
      }),
    );
    return {
      ok: true,
      host: "terabox",
      inputUrl: rawUrl,
      title: pub.title,
      files,
      warnings: [`Original file is ready via ${pub.source}.`],
      usedCookie: false,
      elapsedMs: Date.now() - started,
      source: pub.source,
    };
  }

  return {
    ok: false,
    host: "terabox",
    inputUrl: rawUrl,
    error: "Could not open that TeraBox share.",
    hint: hintForNativeError(pubFail || "The share may have expired, or TeraBox is rate-limiting right now."),
    elapsedMs: Date.now() - started,
  };
}
