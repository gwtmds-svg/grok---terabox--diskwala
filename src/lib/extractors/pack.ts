import type { ResolveResult, ResolvedFile } from "./types";
import { detectHost } from "./parse-url";
import { expandPaste, normalizePaste } from "./unwrap";
import { putMedia, putPack, refererFor } from "./media-cache";
import { resolveTerabox } from "./terabox";
import { resolveBlatim } from "./blatim";
import { resolveDiskwalaPack } from "./diskwala-pack";
import { walkTeraboxPublic, type PublicResolve } from "./terabox-public";
import { enterUser, leaveUser } from "./engine";

function withZip(result: ResolveResult): ResolveResult {
  if (!result.ok) return result;
  const files = result.files.filter((f) => f.mediaId && (f.directUrl || f.hlsUrl));
  if (!files.length) return result;
  const packId = putPack(
    result.title || files[0].name,
    files.map((f) => ({ name: f.name, mediaId: f.mediaId as string, size: f.size })),
  );
  const totalBytes = files.reduce((n, f) => n + (f.size || 0), 0);
  return { ...result, packId, totalBytes };
}

function publicToResolve(rawUrl: string, walked: Extract<PublicResolve, { ok: true }>): ResolveResult {
  const files: ResolvedFile[] = walked.files.map((p, index) => {
    const name = p.name || `file-${index + 1}`;
    const file: ResolvedFile = {
      id: p.fsId || `${index}:${name}`,
      name,
      size: p.size,
      isDir: false,
      path: `/${name}`,
      mimeHint: /\.(mp3|m4a|aac|wav|flac)$/i.test(name)
        ? "audio"
        : /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
          ? "image"
          : "video",
      thumbnail: p.thumbnail,
      duration: p.duration,
      md5: p.md5,
      fsId: p.fsId,
      shareId: p.shareId,
      uk: p.uk,
      host: "terabox",
      directUrl: p.directUrl,
      hlsUrl: p.hlsUrl,
      originalReady: Boolean(p.directUrl),
      canStream: Boolean(p.directUrl || p.hlsUrl),
    };
    if (file.directUrl || file.hlsUrl) {
      file.mediaId = putMedia({
        name: file.name,
        directUrl: file.directUrl,
        hlsUrl: file.hlsUrl,
        referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.teraboxdl.site/"),
      });
    }
    return file;
  });
  const warnings = [
    files.length === 1
      ? "This public share has one file. The rest of that TeraBox account is private and is not listed."
      : `Collected ${files.length} files from this public share — extra pages and folders the worker published. Other shares on the same account stay private.`,
  ];
  if (walked.truncated) {
    warnings.push("Stopped early so Pack stays responsive. A few folders in this share may be missing.");
  }
  return withZip({
    ok: true,
    host: "terabox",
    inputUrl: rawUrl,
    title: walked.title || files[0]?.name || "TeraBox share",
    files,
    warnings,
    usedCookie: false,
    elapsedMs: 0,
    source: walked.source,
  });
}

async function resolvePackOne(rawUrl: string): Promise<ResolveResult> {
  const started = Date.now();
  const host = detectHost(rawUrl.trim());
  if (host === "diskwala") return resolveDiskwalaPack(rawUrl);
  if (host === "terabox") {
    const walked = await walkTeraboxPublic(rawUrl);
    if (walked.ok) return publicToResolve(rawUrl, walked);
    const result = withZip(await resolveTerabox(rawUrl));
    if (!result.ok) return result;
    return {
      ...result,
      warnings: [
        result.files.length === 1
          ? "This public share has one file. The rest of that TeraBox account is private and is not listed."
          : `Collected ${result.files.length} files from this public share. Other shares on the same account stay private.`,
        ...result.warnings,
      ],
    };
  }
  if (host === "blatim") {
    const result = withZip(await resolveBlatim(rawUrl));
    if (!result.ok) return result;
    const warnings =
      result.files.length === 1
        ? [
            "One watch file on this Blatim link. Blatim does not publish the rest of this uploader’s videos. If the file wraps a TeraBox or Diskwala folder, that public folder is included.",
          ]
        : [`Collected ${result.files.length} files behind this Blatim watch. Other uploads on the same account stay private.`];
    return { ...result, warnings: [...warnings, ...result.warnings] };
  }
  return {
    ok: false,
    host,
    inputUrl: rawUrl,
    error: "Folder Pack opens TeraBox, Diskwala and Blatim links.",
    hint: "Paste a public share — Telegram posts are unwrapped to the nested shares.",
    elapsedMs: Date.now() - started,
  };
}

function mergePacks(results: ResolveResult[], inputUrl: string): ResolveResult {
  const ok = results.filter((r): r is Extract<ResolveResult, { ok: true }> => r.ok);
  if (!ok.length) {
    const last = results.find((r) => !r.ok);
    return last && !last.ok
      ? last
      : { ok: false, host: "unknown", inputUrl, error: "Could not collect that pack.", elapsedMs: 0 };
  }
  const files: ResolvedFile[] = [];
  const seen = new Set<string>();
  for (const r of ok) {
    for (const f of r.files) {
      const key = `${f.name}:${f.size}:${f.directUrl || f.hlsUrl || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(f);
    }
  }
  return withZip({
    ok: true,
    host: ok[0].host,
    inputUrl,
    title: ok[0].title,
    files,
    warnings: [
      `Collected ${files.length} files from ${ok.length} share${ok.length === 1 ? "" : "s"} in that paste.`,
      ...ok.flatMap((r) => r.warnings),
    ],
    usedCookie: false,
    elapsedMs: Math.max(...ok.map((r) => r.elapsedMs)),
    source: ok.map((r) => r.source).filter(Boolean).join("+"),
  });
}

/**
 * One folder dump for every supported host. Telegram pastes are unwrapped first.
 * TeraBox pages the public share (worker dir + page, capped). Diskwala walks
 * /app + /playlist + /creator one at a time. Blatim unwraps a watch link.
 * A private account is never listed — only the share that was pasted.
 */
export async function resolvePack(rawUrl: string): Promise<ResolveResult> {
  const started = Date.now();
  enterUser();
  try {
    const normalized = normalizePaste(rawUrl);
    const shares = await expandPaste(normalized, "all");
    if (!shares.length) {
      return {
        ok: false,
        host: "unknown",
        inputUrl: rawUrl,
        error: "Folder Pack opens TeraBox, Diskwala and Blatim links.",
        hint: "Paste a public share — the same hosts as the search bar above, including Telegram posts.",
        elapsedMs: Date.now() - started,
      };
    }
    if (shares.length === 1) {
      const result = await resolvePackOne(shares[0]);
      return { ...result, inputUrl: rawUrl, elapsedMs: Date.now() - started };
    }
    const many: ResolveResult[] = [];
    for (const u of shares.slice(0, 8)) many.push(await resolvePackOne(u));
    const merged = mergePacks(many, rawUrl);
    return { ...merged, elapsedMs: Date.now() - started };
  } finally {
    leaveUser();
  }
}
