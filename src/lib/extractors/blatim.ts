import type { ResolveResult, ResolvedFile } from "./types";
import { detectHost, extractBlatimSlug, extractTeraSurl, extractDiskwalaId } from "./parse-url";
import { isAllowedCdn, MEDIA_UA } from "./cdn";
import { putMedia, refererFor } from "./media-cache";
import { resolveTerabox } from "./terabox";
import { resolveDiskwala } from "./diskwala";
import { record } from "./engine";

const WATCH_API = "https://www.blatim.com";
const SUPABASE = "https://fifytnbsxymlkepelsma.supabase.co";
/** Public anon key shipped in Blatim's own browser bundle. RLS-gated. */
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZnl0bmJzeHltbGtlcGVsc21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NjIyNjgsImV4cCI6MjA5NzAzODI2OH0.baUHOKPXmaO3Gx-198iWC3OWTzYUIrXTlYX02BRaUFY";

type WatchInfo = {
  videoId?: string;
  title?: string;
  description?: string | null;
  originalName?: string;
  contentType?: string;
  sizeMb?: number;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  visibility?: string;
  status?: string;
  uploadSource?: string;
  sourceUrl?: string | null;
  isExternal?: boolean;
  view_count?: number;
  uploader_channel_name?: string | null;
};

function mimeHint(name: string): ResolvedFile["mimeHint"] {
  if (/\.(mp4|mkv|webm|mov|m4v|h264)$/i.test(name)) return "video";
  if (/\.(mp3|m4a|aac|wav|flac)$/i.test(name)) return "audio";
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "image";
  return "video";
}

function attach(file: ResolvedFile): ResolvedFile {
  if (file.directUrl || file.hlsUrl) {
    file.mediaId = putMedia({
      name: file.name,
      directUrl: file.directUrl,
      hlsUrl: file.hlsUrl,
      referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.blatim.com/"),
    });
  }
  return file;
}

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "user-agent": MEDIA_UA,
      accept: "application/json",
      origin: "https://www.blatim.com",
      referer: "https://www.blatim.com/",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchInfo(slug: string): Promise<WatchInfo | null> {
  const json = await fetchJson(`${WATCH_API}/api/video/${encodeURIComponent(slug)}/info`);
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const row = json as WatchInfo & { error?: string };
    if (!row.error && (row.videoId || row.title || row.originalName || row.sourceUrl)) return row;
  }
  return null;
}

async function fetchRpc(slug: string): Promise<WatchInfo | null> {
  const json = await fetchJson(`${SUPABASE}/rest/v1/rpc/get_public_watch_file`, {
    method: "POST",
    headers: {
      apikey: ANON,
      authorization: `Bearer ${ANON}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_slug: slug }),
  });
  const row = Array.isArray(json) ? json[0] : json;
  if (row && typeof row === "object") return row as WatchInfo;
  return null;
}

async function probeBytes(url: string): Promise<{ size: number; ok: boolean }> {
  if (!isAllowedCdn(url)) return { size: 0, ok: false };
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": MEDIA_UA,
        accept: "*/*",
        range: "bytes=0-15",
        referer: "https://www.blatim.com/",
        origin: "https://www.blatim.com",
      },
      signal: AbortSignal.timeout(12000),
    });
    const range = res.headers.get("content-range");
    const total = range?.match(/\/(\d+)$/)?.[1];
    const size = total ? Number(total) : Number(res.headers.get("content-length") || 0);
    const buf = new Uint8Array(await res.arrayBuffer().catch(() => new ArrayBuffer(0)));
    const isMp4 = buf.length >= 8 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    return { size: Number.isFinite(size) ? size : 0, ok: res.ok || res.status === 206 || isMp4 };
  } catch {
    return { size: 0, ok: false };
  }
}

function fileName(info: WatchInfo, slug: string): string {
  const raw = (info.originalName || info.title || slug).trim() || slug;
  if (/\.[a-z0-9]{2,5}$/i.test(raw)) return raw;
  return `${raw}.mp4`;
}

function wrapHost(files: ResolvedFile[]): ResolvedFile[] {
  return files.map((f) => ({ ...f, host: "blatim" as const }));
}

/**
 * Blatim /watch/:slug is an app-install wall (Broadcaster / BSplit). The public
 * /api/video/:slug/info JSON is unauthenticated and, for external uploads,
 * includes the original CDN URL (VidBunker, TeraBox, Diskwala). Local uploads
 * sit behind a Firebase App Check signed stream — we still list those.
 */
export async function resolveBlatim(rawUrl: string): Promise<ResolveResult> {
  const started = Date.now();
  const slug = extractBlatimSlug(rawUrl);
  if (!slug) {
    return {
      ok: false,
      host: "blatim",
      inputUrl: rawUrl,
      error: "Could not read a Blatim watch id from that URL.",
      hint: "Use a link like https://www.blatim.com/watch/<id> copied from Telegram, WhatsApp or Broadcaster.",
      elapsedMs: Date.now() - started,
    };
  }

  const [info, rpc] = await Promise.all([fetchInfo(slug), fetchRpc(slug)]);
  const meta: WatchInfo = { ...(rpc || {}), ...(info || {}) };
  record("blatim", "blatim-info", Boolean(info || rpc), Date.now() - started, info?.uploadSource || "watch");
  if (!info && !rpc) {
    return {
      ok: false,
      host: "blatim",
      inputUrl: rawUrl,
      error: "That Blatim watch page is not accessible.",
      hint: "The video may be private, removed, or the link is incomplete. Skipper never opens Blatim in a browser — paste the /watch/ link again if you just copied it.",
      elapsedMs: Date.now() - started,
    };
  }

  const title = (info?.title || rpc?.title || fileName(meta, slug)).replace(/^\/+/, "");
  const sourceUrl = typeof info?.sourceUrl === "string" ? info.sourceUrl : "";
  const warnings: string[] = [];

  if (sourceUrl) {
    const nestedHost = detectHost(sourceUrl);
    if (nestedHost === "terabox" && extractTeraSurl(sourceUrl)) {
      const nested = await resolveTerabox(sourceUrl);
      if (nested.ok && nested.files.length) {
        return {
          ...nested,
          host: "blatim",
          inputUrl: rawUrl,
          title,
          files: wrapHost(nested.files),
          warnings: [
            `Blatim wraps a TeraBox share — listed ${nested.files.length} file${nested.files.length === 1 ? "" : "s"} without the Broadcaster app or ads.`,
            ...nested.warnings,
          ],
          elapsedMs: Date.now() - started,
          source: `blatim+${nested.source || "terabox"}`,
        };
      }
    }
    if (nestedHost === "diskwala" && extractDiskwalaId(sourceUrl)) {
      const nested = await resolveDiskwala(sourceUrl);
      if (nested.ok && nested.files.length) {
        return {
          ...nested,
          host: "blatim",
          inputUrl: rawUrl,
          title,
          files: wrapHost(nested.files),
          warnings: [
            `Blatim wraps a Diskwala share — listed ${nested.files.length} clip${nested.files.length === 1 ? "" : "s"} without installing their app.`,
            ...nested.warnings,
          ],
          elapsedMs: Date.now() - started,
          source: `blatim+${nested.source || "diskwala"}`,
        };
      }
    }

    if (isAllowedCdn(sourceUrl)) {
      const probe = await probeBytes(sourceUrl);
      if (probe.ok) {
        const name = fileName(meta, slug);
        const file = attach({
          id: info?.videoId || slug,
          name,
          size: probe.size || Math.round((Number(info?.sizeMb) || 0) * 1e6),
          isDir: false,
          path: `/${name}`,
          mimeHint: mimeHint(name),
          thumbnail: info?.thumbnailUrl || rpc?.thumbnail_url || undefined,
          duration: info?.durationSeconds || undefined,
          fsId: slug,
          host: "blatim",
          directUrl: sourceUrl,
          originalReady: true,
          canStream: true,
        });
        warnings.push(
          `Original file is on ${new URL(sourceUrl).hostname} — Play and Download skip Blatim's app wall, ads and login.`,
        );
        return {
          ok: true,
          host: "blatim",
          inputUrl: rawUrl,
          title,
          files: [file],
          warnings,
          usedCookie: false,
          elapsedMs: Date.now() - started,
          source: info?.uploadSource || "blatim-info",
        };
      }
    }
  }

  const name = fileName(meta, slug);
  const file = attach({
    id: info?.videoId || slug,
    name,
    size: Math.round((Number(info?.sizeMb) || 0) * 1e6),
    isDir: false,
    path: `/${name}`,
    mimeHint: mimeHint(name),
    thumbnail: info?.thumbnailUrl || rpc?.thumbnail_url || undefined,
    duration: info?.durationSeconds || undefined,
    fsId: slug,
    host: "blatim",
    originalReady: false,
    canStream: false,
  });

  return {
    ok: true,
    host: "blatim",
    inputUrl: rawUrl,
    title,
    files: [file],
    warnings: [
      info?.uploadSource === "local"
        ? "Blatim listed this local upload, but the original bytes sit behind their app-only signed stream (Firebase App Check). External VidBunker / TeraBox / Diskwala watches play here."
        : "Listed the watch page. The original file URL was not published on this share — Play may be unavailable.",
    ],
    usedCookie: false,
    elapsedMs: Date.now() - started,
    source: info?.uploadSource || "blatim-info",
  };
}
