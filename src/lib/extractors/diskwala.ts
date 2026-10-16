import type { ResolveResult, ResolvedFile } from "./types";
import { canonicalDiskwalaUrl, extractDiskwalaId } from "./parse-url";
import { putMedia, refererFor } from "./media-cache";
import { resolveTeraboxPublic } from "./terabox-public";

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

function fileKey(f: { directUrl?: string; hlsUrl?: string; name: string; size?: number }): string {
  if (f.name && f.size) return `${f.name}:${f.size}`;
  return f.directUrl || f.hlsUrl || `${f.name}:0`;
}

/**
 * Diskwala's website /app/:id is a "download the app" SPA. After hydrate it often
 * paints "Page Not Found" even when the file is live. AppiCrypt (Talsec WASM)
 * signs temp_info / playlist_info / creator_info — unsigned calls 400, replay 403.
 *
 * 2026-10: same public worker as TeraBox still returns the original on
 * cdns*.diskwala.com / S3. We race /app/:id and /playlist/:id because albums now
 * live on the playlist route (creator update). Never scrape the SPA title.
 */
export async function resolveDiskwala(rawUrl: string): Promise<ResolveResult> {
  const started = Date.now();
  const id = extractDiskwalaId(rawUrl);
  if (!id) {
    return {
      ok: false,
      host: "diskwala",
      inputUrl: rawUrl,
      error: "Could not read a Diskwala file id from that URL.",
      hint: "Paste https://www.diskwala.com/app/<id> — or a whole Telegram post; Skipper pulls the Diskwala URL out of the message.",
      elapsedMs: Date.now() - started,
    };
  }

  const targets = Array.from(
    new Set([canonicalDiskwalaUrl(id, "app"), canonicalDiskwalaUrl(id, "playlist"), rawUrl.trim()]),
  ).slice(0, 2);

  const filesAcc: Array<{
    name: string;
    size: number;
    fsId?: string;
    thumbnail?: string;
    duration?: number;
    directUrl?: string;
    hlsUrl?: string;
  }> = [];
  let title = "";
  let source = "teraboxdl.site";
  const errors: string[] = [];

  for (const u of targets) {
    const r = await resolveTeraboxPublic(u, { kind: "diskwala" });
    if (!r.ok) {
      errors.push(r.error);
      continue;
    }
    source = r.source;
    title = title || r.title;
    for (const f of r.files) {
      if (!f.directUrl && !f.hlsUrl) continue;
      if (filesAcc.some((x) => fileKey(x) === fileKey(f))) continue;
      filesAcc.push(f);
    }
    if (filesAcc.length) break;
  }

  if (!filesAcc.length) {
    const last = errors[0] || "";
    return {
      ok: false,
      host: "diskwala",
      inputUrl: rawUrl,
      error: "That Diskwala link is not accessible right now.",
      hint: /not found|404|expired|removed/i.test(last)
        ? "The share may have been deleted. Diskwala's own page also shows a fake 404 for live files — if another skip-site still opens it, wait a few seconds and paste again."
        : "Skipper asks a public worker for the original MP4 (Diskwala's website is only an app-install landing). Telegram posts are unwrapped automatically. Try once more if the worker is warming up.",
      elapsedMs: Date.now() - started,
    };
  }

  const files: ResolvedFile[] = filesAcc.map((p) =>
    attach({
      id: p.fsId || `${id}:${p.name}`,
      name: p.name,
      size: p.size,
      isDir: false,
      path: `/${p.name}`,
      mimeHint: mimeHint(p.name),
      thumbnail: p.thumbnail,
      duration: p.duration,
      fsId: p.fsId || id,
      host: "diskwala",
      directUrl: p.directUrl,
      hlsUrl: p.hlsUrl,
      originalReady: Boolean(p.directUrl),
      canStream: Boolean(p.directUrl || p.hlsUrl),
    }),
  );

  const warnings: string[] = [];
  if (files.length > 1) {
    warnings.push(
      `Diskwala listed ${files.length} clips for this id (playlist/album). Use Pack if you want the whole folder as a zip.`,
    );
  }

  return {
    ok: true,
    host: "diskwala",
    inputUrl: rawUrl,
    title: title || files[0].name,
    files,
    warnings,
    usedCookie: false,
    elapsedMs: Date.now() - started,
    source,
  };
}
