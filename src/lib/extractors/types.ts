export type HostKind = "terabox" | "diskwala" | "blatim" | "telegram" | "unknown";

export type ResolvedFile = {
  id: string;
  name: string;
  size: number;
  isDir: boolean;
  path: string;
  mimeHint: "video" | "audio" | "image" | "folder" | "file";
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  md5?: string;
  fsId?: string;
  shareId?: string;
  uk?: string;
  surl?: string;
  /** Official share sign from /api/shorturlinfo — preferred for /share/streaming. */
  shareSign?: string;
  shareTimestamp?: string;
  host: HostKind;
  /** Original file URL (worker / S3 / PCS). Never use as <video src> — proxy it. */
  directUrl?: string;
  /** Optional HLS playlist if no direct URL. */
  hlsUrl?: string;
  /** Short server-side id for /api/file?id= (avoids huge tokens in the query string). */
  mediaId?: string;
  originalReady: boolean;
  canStream: boolean;
};

export type ResolveOk = {
  ok: true;
  host: HostKind;
  inputUrl: string;
  title: string;
  files: ResolvedFile[];
  warnings: string[];
  usedCookie: boolean;
  elapsedMs: number;
  source?: string;
  /** Diskwala Pack — id for /api/pack zip of every collected file. */
  packId?: string;
  totalBytes?: number;
};

export type ResolveErr = {
  ok: false;
  host: HostKind;
  inputUrl: string;
  error: string;
  hint?: string;
  elapsedMs: number;
};

export type ResolveResult = ResolveOk | ResolveErr;
