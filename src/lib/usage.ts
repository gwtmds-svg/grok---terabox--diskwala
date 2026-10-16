import { dbSource, getSql } from "@/lib/db";

export type UsageKind = "share" | "pack" | "any";

export type UsageInsert = {
  kind: UsageKind;
  host: string;
  outcome: "ok" | "fail";
  fileCount: number;
  elapsedMs: number;
  device: "mobile" | "desktop";
};

export type UsageSummary = {
  total: number;
  ok: number;
  today: number;
  mobile: number;
  files: number;
  hosts: { host: string; n: number }[];
  stored: boolean;
  backend: "neon" | "pglite";
};

const EMPTY: UsageSummary = {
  total: 0,
  ok: 0,
  today: 0,
  mobile: 0,
  files: 0,
  hosts: [],
  stored: false,
  backend: dbSource,
};

function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function parseUsage(data: unknown): UsageInsert | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const kind = d.kind === "share" || d.kind === "pack" || d.kind === "any" ? d.kind : null;
  if (!kind) return null;
  const host =
    typeof d.host === "string" ? d.host.toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 120) : "";
  if (!host || host.includes("..") || host.startsWith(".") || host.endsWith(".")) return null;
  const outcome = d.outcome === "ok" || d.outcome === "fail" ? d.outcome : null;
  if (!outcome) return null;
  const device = d.device === "mobile" ? "mobile" : "desktop";
  return {
    kind,
    host,
    outcome,
    fileCount: clampInt(d.fileCount, 0, 500),
    elapsedMs: clampInt(d.elapsedMs, 0, 180000),
    device,
  };
}

let summaryCache: { at: number; data: UsageSummary } | null = null;
let pruneAt = 0;

export async function recordUsage(row: UsageInsert): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into usage_events (kind, host, outcome, file_count, elapsed_ms, device)
    values (${row.kind}, ${row.host}, ${row.outcome}, ${row.fileCount}, ${row.elapsedMs}, ${row.device})
  `;
  summaryCache = null;
  const now = Date.now();
  if (now - pruneAt > 60 * 60 * 1000) {
    pruneAt = now;
    await sql`delete from usage_events where created_at < now() - interval '90 days'`;
  }
}

function num(value: unknown): number {
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function usageSummary(): Promise<UsageSummary> {
  if (summaryCache && Date.now() - summaryCache.at < 8000) return summaryCache.data;
  try {
    const sql = await getSql();
    const [row] = await sql<{
      total: unknown;
      ok: unknown;
      today: unknown;
      mobile: unknown;
      files: unknown;
    }>`
      select
        count(*) as total,
        count(*) filter (where outcome = 'ok') as ok,
        count(*) filter (where created_at > now() - interval '1 day') as today,
        count(*) filter (where device = 'mobile') as mobile,
        coalesce(sum(file_count), 0) as files
      from usage_events
    `;
    const hosts = await sql<{ host: string; n: unknown }>`
      select host, count(*) as n
      from usage_events
      group by host
      order by count(*) desc
      limit 5
    `;
    const data: UsageSummary = {
      total: num(row?.total),
      ok: num(row?.ok),
      today: num(row?.today),
      mobile: num(row?.mobile),
      files: num(row?.files),
      hosts: hosts.map((h) => ({ host: String(h.host), n: num(h.n) })),
      stored: true,
      backend: dbSource,
    };
    summaryCache = { at: Date.now(), data };
    return data;
  } catch {
    return EMPTY;
  }
}
