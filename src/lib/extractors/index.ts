import type { ResolveResult, ResolvedFile } from "./types";
import { detectHost } from "./parse-url";
import { expandPaste, normalizePaste } from "./unwrap";
import { resolveTerabox } from "./terabox";
import { resolveDiskwala } from "./diskwala";
import { resolveBlatim } from "./blatim";
import { enterUser, leaveUser } from "./engine";

export type { ResolveResult, ResolveOk, ResolveErr, ResolvedFile, HostKind } from "./types";
export {
  detectHost,
  extractTeraSurl,
  extractDiskwalaId,
  extractBlatimSlug,
  canonicalTeraboxUrl,
  canonicalDiskwalaUrl,
  canonicalBlatimUrl,
  normalizePaste,
} from "./parse-url";
export { teraboxStreamUrl, fetchTeraboxPlaylist, fetchTeraboxDlink } from "./terabox";

function isTransient(error: string): boolean {
  return /timeout|rate|warming|try again|no public resolver|429|502|503/i.test(error);
}

async function resolveOne(url: string, cookie: string): Promise<ResolveResult> {
  const host = detectHost(url);
  try {
    if (host === "terabox") return await resolveTerabox(url, cookie);
    if (host === "diskwala") return await resolveDiskwala(url);
    if (host === "blatim") return await resolveBlatim(url);
  } catch (err) {
    return {
      ok: false,
      host,
      inputUrl: url,
      error: "Could not open that share.",
      hint: err instanceof Error ? err.message : String(err),
      elapsedMs: 0,
    };
  }
  return {
    ok: false,
    host: host === "telegram" ? "telegram" : "unknown",
    inputUrl: url,
    error: host === "telegram" ? "Could not read a share from that Telegram post." : "That host is not supported yet.",
    hint: "Paste a TeraBox, Diskwala or Blatim link — a full Telegram post, t.me/s preview, or a messy copy with extra text is fine.",
    elapsedMs: 0,
  };
}

function mergeOk(results: ResolveResult[], inputUrl: string): ResolveResult {
  const ok = results.filter((r): r is Extract<ResolveResult, { ok: true }> => r.ok);
  if (!ok.length) {
    const last = results.find((r) => !r.ok);
    return last && !last.ok
      ? last
      : {
          ok: false,
          host: "unknown",
          inputUrl,
          error: "Could not open those shares.",
          elapsedMs: 0,
        };
  }
  const files: ResolvedFile[] = [];
  const seen = new Set<string>();
  for (const r of ok) {
    for (const f of r.files) {
      const key = `${f.host}:${f.name}:${f.size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(f);
    }
  }
  const warnings = ok.flatMap((r) => r.warnings);
  if (ok.length > 1) warnings.unshift(`Opened ${ok.length} shares from that paste.`);
  return {
    ok: true,
    host: ok[0].host,
    inputUrl,
    title: ok[0].title,
    files,
    warnings,
    usedCookie: ok.some((r) => r.usedCookie),
    elapsedMs: Math.max(...ok.map((r) => r.elapsedMs)),
    source: ok.map((r) => r.source).filter(Boolean).join("+") || ok[0].source,
  };
}

export async function resolveShare(rawUrl: string, cookie = ""): Promise<ResolveResult> {
  const started = Date.now();
  enterUser();
  try {
    const url = normalizePaste(rawUrl);
    if (!url) {
      return {
        ok: false,
        host: "unknown",
        inputUrl: rawUrl,
        error: "Paste a TeraBox, Diskwala, Blatim or Telegram link first.",
        elapsedMs: 0,
      };
    }

    const shares = await expandPaste(url, "one");
    const target = shares[0] || url;
    let result = await resolveOne(target, cookie);
    if (!result.ok && isTransient(`${result.error} ${result.hint || ""}`)) {
      result = await resolveOne(target, cookie);
    }
    if (result.ok || result.host !== "unknown") {
      return { ...result, inputUrl: rawUrl, elapsedMs: Date.now() - started };
    }

    const extras = await expandPaste(url, "all");
    if (extras.length > 1) {
      const many = await Promise.all(extras.slice(0, 6).map((u) => resolveOne(u, cookie)));
      const merged = mergeOk(many, rawUrl);
      return { ...merged, elapsedMs: Date.now() - started };
    }
    return { ...result, inputUrl: rawUrl, elapsedMs: Date.now() - started };
  } finally {
    leaveUser();
  }
}
