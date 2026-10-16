import { randomBytes } from "node:crypto";

export type MediaEntry = {
  name: string;
  directUrl?: string;
  hlsUrl?: string;
  referer: string;
  expires: number;
  /** Minted by Any video. Proxy this exact file only — not an open proxy. */
  publicDirect?: boolean;
};

export type PackFile = {
  name: string;
  mediaId: string;
  size: number;
};

export type PackEntry = {
  title: string;
  files: PackFile[];
  expires: number;
};

const TTL_MS = 25 * 60 * 1000;
const store = new Map<string, MediaEntry>();
const packs = new Map<string, PackEntry>();
const segmentAllow = new Map<string, Set<string>>();

function gc() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expires < now) {
      store.delete(k);
      segmentAllow.delete(k);
    }
  }
  for (const [k, v] of packs) {
    if (v.expires < now) packs.delete(k);
  }
}

export function putMedia(entry: Omit<MediaEntry, "expires">): string {
  gc();
  const id = randomBytes(12).toString("hex");
  store.set(id, { ...entry, expires: Date.now() + TTL_MS });
  return id;
}

export function getMedia(id: string): MediaEntry | null {
  const row = store.get(id);
  if (!row || row.expires < Date.now()) {
    store.delete(id);
    segmentAllow.delete(id);
    return null;
  }
  return row;
}

export function putPack(title: string, files: PackFile[]): string {
  gc();
  const id = randomBytes(12).toString("hex");
  packs.set(id, { title, files, expires: Date.now() + TTL_MS });
  return id;
}

export function getPack(id: string): PackEntry | null {
  const row = packs.get(id);
  if (!row || row.expires < Date.now()) {
    packs.delete(id);
    return null;
  }
  return row;
}

export function allowSegments(id: string, urls: string[]) {
  let set = segmentAllow.get(id);
  if (!set) {
    set = new Set();
    segmentAllow.set(id, set);
  }
  for (const url of urls) {
    if (set.size >= 4000) break;
    set.add(url);
  }
}

export function segmentAllowed(id: string, url: string): boolean {
  return segmentAllow.get(id)?.has(url) ?? false;
}

export function refererFor(url: string, fallback: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.endsWith("teraboxdl.site")) return "https://www.teraboxdl.site/";
    if (
      h.endsWith("diskwala.com") ||
      h.endsWith("revwala.com") ||
      h.endsWith("diskwala-fast-edge.net") ||
      h.endsWith("dw2in.com") ||
      h.includes("amazonaws")
    ) {
      return "https://www.diskwala.com/";
    }
    if (h.endsWith("blatim.com") || h.endsWith("supabase.co") || h.endsWith("vidbunker.in") || h.endsWith("vidbunker.com")) {
      return "https://www.blatim.com/";
    }
    if (
      h.includes("terabox") ||
      h.includes("1024tera") ||
      h.includes("freeterabox") ||
      h.includes("4funbox") ||
      h.includes("nephobox") ||
      h.includes("mirrobox") ||
      h.includes("momerybox") ||
      h.includes("tibibox")
    ) {
      return "https://www.1024tera.com/";
    }
  } catch {
    /* ignore */
  }
  return fallback;
}
