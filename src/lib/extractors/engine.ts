import { MEDIA_UA } from "./cdn";

export type EngineHost = "terabox" | "diskwala" | "blatim";

export type HostPulse = {
  host: EngineHost;
  state: "live" | "slow" | "down" | "unknown";
  strategy: string;
  latencyMs: number;
  note: string;
  checkedAt: number;
};

type Row = {
  ok: number;
  fail: number;
  lastOk: number;
  lastFail: number;
  ms: number;
  note: string;
};

const rows = new Map<string, Row>();
const REFRESH_MS = 10 * 60 * 1000;
let refreshing: Promise<HostPulse[]> | null = null;
let lastRefresh = 0;
let userDepth = 0;
let kickTimer: ReturnType<typeof setTimeout> | null = null;

const ALLOWED = new Set(["https://www.teraboxdl.site", "https://www.diskwala.com", "https://www.blatim.com"]);

type Surface = {
  proxyPath: string;
  teraboxScripts: string;
  diskwalaBundle: string;
  diskwalaApi: string;
  diskwalaSigned: boolean;
  blatimBundle: string;
  canWalkFolders: boolean;
  summary: string;
  learnedAt: number;
};

const surface: Surface = {
  proxyPath: "/api/proxy",
  teraboxScripts: "",
  diskwalaBundle: "",
  diskwalaApi: "https://ddudapidd.diskwala.com/api/v1/",
  diskwalaSigned: true,
  blatimBundle: "",
  canWalkFolders: true,
  summary:
    "Skipper rechecks the public pages these hosts ship and prefers the path that last answered. One link lists that public share only — never a private account.",
  learnedAt: 0,
};

function key(host: string, strategy: string) {
  return `${host}:${strategy}`;
}

export function enterUser(): void {
  userDepth += 1;
}

export function leaveUser(): void {
  userDepth = Math.max(0, userDepth - 1);
}

export function userBusy(): boolean {
  return userDepth > 0;
}

/** Path their own site last published. Only /api/… we already trust. */
export function learnedProxyPath(): string {
  return surface.proxyPath;
}

/** True while their published client still asks the worker for folder dir + page. */
export function learnedFolderWalk(): boolean {
  return surface.canWalkFolders;
}

export function record(host: string, strategy: string, ok: boolean, ms: number, note = ""): void {
  const row = rows.get(key(host, strategy)) ?? { ok: 0, fail: 0, lastOk: 0, lastFail: 0, ms: 0, note: "" };
  if (ok) {
    row.ok += 1;
    row.lastOk = Date.now();
    row.ms = ms;
  } else {
    row.fail += 1;
    row.lastFail = Date.now();
  }
  row.note = note.slice(0, 160);
  rows.set(key(host, strategy), row);
}

function rank(host: string, strategy: string, index: number): number {
  // Catalog order wins until a strategy has actually answered.
  let s = (20 - index) * 10;
  const row = rows.get(key(host, strategy));
  if (!row) return s;
  const now = Date.now();
  const recentOk = row.lastOk > 0 && row.lastOk >= row.lastFail && now - row.lastOk < 15 * 60 * 1000;
  const recentFail = row.lastFail > row.lastOk && now - row.lastFail < 10 * 60 * 1000;
  if (recentOk) s += 40;
  if (recentOk && row.ms > 0 && row.ms < 2000) s += 8;
  if (recentFail) s -= 70;
  return s;
}

export function orderByHealth<T extends { name: string }>(host: string, list: T[]): T[] {
  return list
    .map((item, index) => ({ item, index, s: rank(host, item.name, index) }))
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .map((row) => row.item);
}

function pulse(host: EngineHost, strategy: string, fallback: string): HostPulse {
  const row = rows.get(key(host, strategy));
  if (!row || (!row.lastOk && !row.lastFail)) {
    return { host, state: "unknown", strategy, latencyMs: 0, note: fallback, checkedAt: 0 };
  }
  const freshOk = row.lastOk > row.lastFail;
  const state: HostPulse["state"] = !freshOk ? "down" : row.ms > 6000 ? "slow" : "live";
  return {
    host,
    state,
    strategy,
    latencyMs: row.ms,
    note: row.note || fallback,
    checkedAt: Math.max(row.lastOk, row.lastFail),
  };
}

export function snapshot(): HostPulse[] {
  return [
    pulse(
      "terabox",
      "teraboxdl.site",
      `Public worker ${surface.proxyPath} on teraboxdl.site. Not checked this session yet.`,
    ),
    pulse(
      "diskwala",
      "teraboxdl.site",
      surface.diskwalaSigned
        ? "Diskwala’s own API is still AppiCrypt-signed, so originals only come from the public worker — often down."
        : "Diskwala published an unsigned API. Skipper will try the worker first.",
    ),
    pulse("blatim", "blatim-info", "Public watch info. Not checked this session yet."),
  ];
}

export function statusPayload() {
  const hosts = snapshot();
  return {
    ok: true as const,
    hosts,
    summary: surface.summary,
    checkedAt: surface.learnedAt || hosts.reduce((max, h) => Math.max(max, h.checkedAt), 0),
    learning: Boolean(refreshing),
    busy: userBusy(),
  };
}

async function readCapped(url: string, timeoutMs: number, maxBytes: number): Promise<{ finalUrl: string; text: string } | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!ALLOWED.has(parsed.origin)) return null;
  if (parsed.pathname.includes("..")) return null;
  try {
    const res = await fetch(parsed, {
      headers: { "user-agent": MEDIA_UA, accept: "*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!ALLOWED.has(new URL(res.url).origin)) return null;
    const reader = res.body?.getReader();
    if (!reader) return { finalUrl: res.url, text: (await res.text()).slice(0, maxBytes) };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.byteLength;
    }
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
    const text = new TextDecoder().decode(concat(chunks));
    return { finalUrl: res.url, text: text.slice(0, maxBytes) };
  } catch {
    return null;
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}

function safePath(raw: string): string | null {
  if (!/^\/api\/[a-z0-9/_-]{1,48}$/i.test(raw)) return null;
  if (!/proxy|extract|download/i.test(raw)) return null;
  return raw;
}

async function learnSurfaces(): Promise<void> {
  if (userBusy()) return;
  const home = await readCapped("https://www.teraboxdl.site/", 8000, 180_000);
  if (home && !userBusy()) {
    const scripts = [
      ...new Set([...home.text.matchAll(/\/_next\/static\/chunks\/[^"'\\\s>]+\.js/g)].map((m) => m[0])),
    ].filter((p) => p.startsWith("/_next/") && !p.includes(".."));
    const scriptKey = scripts.join("|");
    if (scriptKey && scriptKey !== surface.teraboxScripts) {
      let found = surface.proxyPath;
      const interesting = scripts.filter((p) => !/webpack|main-app|framework|polyfill/i.test(p)).slice(0, 8);
      for (const path of interesting) {
        if (userBusy()) break;
        const js = await readCapped(`https://www.teraboxdl.site${path}`, 8000, 220_000);
        const hit = js?.text.match(/["'`](\/api\/[a-z0-9/_-]{2,48})["'`]/i)?.[1];
        const safe = hit ? safePath(hit) : null;
        if (safe && js) {
          found = safe;
          if (/f\.dir\s*=/.test(js.text) && /f\.page\s*=/.test(js.text)) surface.canWalkFolders = true;
          else if (/has_more/.test(js.text) && /lazy_folder/.test(js.text) && !/f\.dir\s*=/.test(js.text)) {
            surface.canWalkFolders = false;
          }
          break;
        }
      }
      surface.teraboxScripts = scriptKey;
      if (found !== surface.proxyPath) surface.proxyPath = found;
    }
  }

  if (userBusy()) return;
  const dw = await readCapped("https://www.diskwala.com/", 8000, 20_000);
  const bundle = dw?.text.match(/\/static\/js\/main\.[a-z0-9]+\.js/i)?.[0] || "";
  if (bundle && bundle !== surface.diskwalaBundle && !userBusy()) {
    const js = await readCapped(`https://www.diskwala.com${bundle}`, 10000, 750_000);
    if (js) {
      const api = js.text.match(/https:\/\/[a-z0-9.-]+\.diskwala\.com\/api\/v1\//i)?.[0];
      if (api) surface.diskwalaApi = api;
      surface.diskwalaSigned = /appicrypt/i.test(js.text);
      surface.diskwalaBundle = bundle;
    }
  }

  if (userBusy()) return;
  const bl = await readCapped("https://www.blatim.com/watch/lnGRKC5SxCbIy6yW", 8000, 20_000);
  const blBundle = bl?.text.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] || "";
  if (blBundle && blBundle !== surface.blatimBundle && !userBusy()) {
    const js = await readCapped(`https://www.blatim.com${blBundle}`, 8000, 200_000);
    surface.blatimBundle = blBundle;
    if (js && !/\/api\/video\//.test(js.text) && !js.text.includes("/api/video")) {
      surface.summary = "Blatim shipped a new page bundle that no longer mentions /api/video. Watch info is still tried directly.";
    }
  }

  const when = new Date().toISOString().slice(0, 16).replace("T", " ");
  const pathNote =
    surface.proxyPath === "/api/proxy"
      ? "TeraBox worker is still POST /api/proxy."
      : `TeraBox worker moved to ${surface.proxyPath} — Skipper follows that.`;
  const walkNote = surface.canWalkFolders
    ? "Folder Pack still pages that public share."
    : "Their client stopped sending folder pages — Pack lists the first page only.";
  const dwNote = surface.diskwalaSigned
    ? "Diskwala still signs its API, so originals only come from the public worker."
    : "Diskwala’s bundle no longer looks signed.";
  surface.summary = `${pathNote} ${walkNote} ${dwNote} Checked ${when} UTC. One link lists that public share, not a private account.`;
  surface.learnedAt = Date.now();
}

async function probeJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ ok: boolean; ms: number; note: string }> {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    const ms = Date.now() - started;
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      if (json.errno === 0 || json.videoId || json.success === true || json.direct_link) {
        return { ok: true, ms, note: "answering" };
      }
      return {
        ok: false,
        ms,
        note: String(json.error || json.detail || json.errmsg || res.status).slice(0, 120),
      };
    } catch {
      return { ok: res.ok, ms, note: String(res.status) };
    }
  } catch (err) {
    return { ok: false, ms: Date.now() - started, note: err instanceof Error ? err.message : "probe failed" };
  }
}

async function probeAll(): Promise<{ pulses: HostPulse[]; done: boolean }> {
  if (userBusy()) return { pulses: snapshot(), done: false };
  await learnSurfaces();
  if (userBusy()) return { pulses: snapshot(), done: false };

  const headers = {
    "user-agent": MEDIA_UA,
    accept: "application/json",
    "content-type": "application/json",
    origin: "https://www.teraboxdl.site",
    referer: "https://www.teraboxdl.site/",
  };
  const terabox = await probeJson(
    `https://www.teraboxdl.site${surface.proxyPath}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://1024terabox.com/s/1Q_R1bPVDax-6zXT9koAc4A" }),
    },
    10000,
  );
  record(
    "terabox",
    "teraboxdl.site",
    terabox.ok,
    terabox.ms,
    terabox.ok ? `Original file via ${surface.proxyPath}.` : terabox.note,
  );
  if (userBusy()) return { pulses: snapshot(), done: false };

  const diskwala = await probeJson(
    `https://www.teraboxdl.site${surface.proxyPath}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://www.diskwala.com/app/6ab3fbfd2a52418b24e638cd" }),
    },
    8000,
  );
  record(
    "diskwala",
    "teraboxdl.site",
    diskwala.ok,
    diskwala.ms,
    diskwala.ok ? "Diskwala original answered." : diskwala.note,
  );
  if (userBusy()) return { pulses: snapshot(), done: false };

  const blatim = await probeJson(
    "https://www.blatim.com/api/video/lnGRKC5SxCbIy6yW/info",
    {
      headers: {
        "user-agent": MEDIA_UA,
        accept: "application/json",
        origin: "https://www.blatim.com",
        referer: "https://www.blatim.com/",
      },
    },
    8000,
  );
  record("blatim", "blatim-info", blatim.ok, blatim.ms, blatim.ok ? "Watch info is public." : blatim.note);
  return { pulses: snapshot(), done: true };
}

export function refreshHealth(force = false): Promise<HostPulse[]> {
  if (userBusy() && !force) return Promise.resolve(snapshot());
  if (refreshing) return refreshing;
  if (!force && lastRefresh && Date.now() - lastRefresh < REFRESH_MS) return Promise.resolve(snapshot());
  refreshing = probeAll()
    .then((result) => {
      if (result.done) lastRefresh = Date.now();
      return result.pulses;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Start a check only when nobody is opening a link. Never blocks the caller. */
export function kickRefresh(): void {
  if (refreshing || kickTimer) return;
  if (lastRefresh && Date.now() - lastRefresh < REFRESH_MS) return;
  // Wait so a paste in the first seconds is not competing with the crawl.
  kickTimer = setTimeout(() => {
    kickTimer = null;
    if (userBusy()) {
      kickRefresh();
      return;
    }
    void refreshHealth(false);
  }, 12000);
}
