import type { ResolveResult, ResolvedFile } from "./types";
import { detectHost, extractDiskwalaId } from "./parse-url";
import { putMedia, putPack, refererFor } from "./media-cache";
import { resolveTeraboxPublic, type PublicFile, type PublicResolve } from "./terabox-public";

const MAX_FILES = 40;

function mimeHint(name: string): ResolvedFile["mimeHint"] {
  if (/\.(mp4|mkv|webm|mov|m4v|h264)$/i.test(name)) return "video";
  if (/\.(mp3|m4a|aac|wav|flac)$/i.test(name)) return "audio";
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "image";
  return "file";
}

function attach(file: ResolvedFile): ResolvedFile {
  if (file.directUrl || file.hlsUrl) {
    file.mediaId = putMedia({
      name: file.name,
      directUrl: file.directUrl,
      hlsUrl: file.hlsUrl,
      referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.diskwala.com/"),
    });
  }
  return file;
}

function asResolved(p: PublicFile, packKey: string, index: number): ResolvedFile {
  const name = p.name || `file-${index + 1}`;
  return attach({
    id: `${packKey}:${index}:${p.fsId || name}`,
    name,
    size: p.size,
    isDir: false,
    path: `/${name}`,
    mimeHint: mimeHint(name),
    thumbnail: p.thumbnail,
    duration: p.duration,
    fsId: p.fsId || packKey,
    host: "diskwala",
    directUrl: p.directUrl,
    hlsUrl: p.hlsUrl,
    originalReady: Boolean(p.directUrl),
    canStream: Boolean(p.directUrl || p.hlsUrl),
  });
}

function storagePrefix(url?: string): string {
  if (!url) return "";
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    return path.split("/").filter(Boolean)[0] || "";
  } catch {
    return "";
  }
}

function fileKey(f: PublicFile): string {
  return f.directUrl || f.hlsUrl || `${f.name}:${f.size}`;
}

function dedupe(files: PublicFile[]): PublicFile[] {
  const seen = new Set<string>();
  const out: PublicFile[] = [];
  for (const f of files) {
    const key = fileKey(f);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out.slice(0, MAX_FILES);
}

function packUrlsFor(rawUrl: string, id: string): string[] {
  let path = "";
  try {
    path = new URL(rawUrl).pathname.toLowerCase();
  } catch {
    path = "";
  }
  const app = `https://www.diskwala.com/app/${id}`;
  const playlist = `https://www.diskwala.com/playlist/${id}`;
  const creator = `https://www.diskwala.com/creator/${id}`;
  if (path.includes("/playlist/")) return [rawUrl, app, creator];
  if (path.includes("/creator/")) return [rawUrl, playlist, app];
  return [playlist, rawUrl.startsWith("http") ? rawUrl : app, creator];
}

/**
 * Diskwala /app/:id is one clip. The same id as /playlist/:id is how Telegram
 * albums and multi-file posts list every related clip. Pack fetches both and
 * merges — seed file always kept, playlist siblings kept when they share the
 * same storage prefix (same post/folder). If prefixes differ we still surface
 * the playlist files (the worker's album dump) plus the exact share.
 */
export async function resolveDiskwalaPack(rawUrl: string): Promise<ResolveResult> {
  const started = Date.now();
  const trimmed = rawUrl.trim();
  if (detectHost(trimmed) !== "diskwala") {
    return {
      ok: false,
      host: detectHost(trimmed),
      inputUrl: rawUrl,
      error: "Folder Pack only opens Diskwala, TeraBox and Blatim links.",
      hint: "Use the search bar above, or paste a diskwala.com / terabox / blatim.com link here for the folder dump.",
      elapsedMs: Date.now() - started,
    };
  }

  const id = extractDiskwalaId(trimmed);
  if (!id) {
    return {
      ok: false,
      host: "diskwala",
      inputUrl: rawUrl,
      error: "Could not read a Diskwala id from that URL.",
      hint: "Paste https://www.diskwala.com/app/<id> — Pack also tries /playlist/<id> for every related clip.",
      elapsedMs: Date.now() - started,
    };
  }

  const targets = packUrlsFor(trimmed, id);
  const results: PublicResolve[] = [];
  for (const u of targets) {
    results.push(await resolveTeraboxPublic(u, { kind: "diskwala" }));
  }

  let seedFiles: PublicFile[] = [];
  let albumFiles: PublicFile[] = [];
  let title = "";
  let source = "teraboxdl.site";

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.ok) continue;
    source = r.source;
    const playable = r.files.filter((f) => f.directUrl || f.hlsUrl);
    if (!playable.length) continue;
    if (/\/playlist\//i.test(targets[i])) {
      albumFiles = playable;
      title = r.title || title;
    } else if (/\/app\//i.test(targets[i]) || i === targets.length - 1) {
      seedFiles = playable;
      if (!title) title = r.title;
    } else {
      albumFiles = albumFiles.length >= playable.length ? albumFiles : playable;
      title = title || r.title;
    }
  }

  const seedPrefix = storagePrefix(seedFiles[0]?.directUrl);
  const albumPrefix = storagePrefix(albumFiles[0]?.directUrl);
  const sameFolder = Boolean(seedPrefix && albumPrefix && seedPrefix === albumPrefix);

  let merged: PublicFile[] = [];
  if (albumFiles.length > 1 && sameFolder) {
    merged = [...albumFiles];
    for (const s of seedFiles) {
      if (!merged.some((f) => fileKey(f) === fileKey(s))) merged.unshift(s);
    }
  } else if (seedFiles.length) {
    merged = [...seedFiles];
    if (sameFolder) {
      for (const a of albumFiles) {
        if (!merged.some((f) => fileKey(f) === fileKey(a))) merged.push(a);
      }
    }
  } else {
    merged = [...albumFiles];
  }
  merged = dedupe(merged);

  if (!merged.length) {
    const lastErr = results.find((r) => !r.ok);
    return {
      ok: false,
      host: "diskwala",
      inputUrl: rawUrl,
      error: "Could not collect that Diskwala pack.",
      hint: lastErr && !lastErr.ok ? lastErr.error : "The worker listed no playable files for this id.",
      elapsedMs: Date.now() - started,
    };
  }

  const files = merged.map((p, i) => asResolved(p, id, i));
  const packId = putPack(
    title || files[0].name,
    files
      .filter((f) => f.mediaId)
      .map((f) => ({ name: f.name, mediaId: f.mediaId as string, size: f.size })),
  );
  const totalBytes = files.reduce((n, f) => n + (f.size || 0), 0);

  const warnings: string[] = [];
  if (files.length === 1) {
    warnings.push("Only one clip on this id — Diskwala did not attach a multi-file album.");
  } else if (sameFolder) {
    warnings.push(`Collected ${files.length} clips from the same Diskwala folder.`);
  } else {
    warnings.push(
      `Kept the exact share (${files.length} file${files.length === 1 ? "" : "s"}). A worker album dump looked unrelated, so it was not mixed in — paste a /playlist/ link if this is a folder.`,
    );
  }

  return {
    ok: true,
    host: "diskwala",
    inputUrl: rawUrl,
    title: seedFiles[0]?.name || title || files[0].name,
    files,
    warnings,
    usedCookie: false,
    elapsedMs: Date.now() - started,
    source,
    packId,
    totalBytes,
  };
}
