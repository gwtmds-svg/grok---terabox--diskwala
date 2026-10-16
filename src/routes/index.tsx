import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Clock, Package, Settings2, Shield, Zap } from "lucide-react";
import { resolveLink, resolvePackFn } from "@/lib/extractors/resolve.functions";
import { loginTeraboxFn, logoutTeraboxFn, sessionStatusFn } from "@/lib/extractors/login.functions";
import type { ResolveResult, ResolvedFile } from "@/lib/extractors/types";
import { detectHost, normalizePaste } from "@/lib/extractors/parse-url";
import {
  clearHistory,
  loadCookie,
  loadHistory,
  pushHistory,
  saveCookie,
  type HistoryItem,
} from "@/lib/history";
import { FileCard } from "@/components/file-card";
import { StreamPlayer } from "@/components/player";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";
import { deviceKind, reportUsage, usageHost } from "@/lib/usage-client";

export const Route = createFileRoute("/")({ component: Home });

const EXAMPLES = [
  {
    label: "TeraBox sample",
    url: "https://1024tera.com/s/16-BFJ6KJhZEBpv_vhNsD6w",
  },
  {
    label: "Diskwala sample",
    url: "https://www.diskwala.com/app/6ab3fbfd2a52418b24e638cd",
  },
  {
    label: "Blatim sample",
    url: "https://www.blatim.com/watch/lnGRKC5SxCbIy6yW",
  },
];

function Home() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [playing, setPlaying] = useState<ResolvedFile | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cookie, setCookie] = useState(() => (typeof window === "undefined" ? "" : loadCookie()));
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    typeof window === "undefined" ? [] : loadHistory(),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [session, setSession] = useState<{ active: boolean; emailMasked: string; ndusTail: string }>({
    active: false,
    emailMasked: "",
    ndusTail: "",
  });
  const [packUrl, setPackUrl] = useState("");
  const [packBusy, setPackBusy] = useState(false);
  const [pack, setPack] = useState<ResolveResult | null>(null);
  const [savingEach, setSavingEach] = useState(false);
  const [pulses, setPulses] = useState<
    Array<{ host: string; state: string; note: string; latencyMs: number }>
  >([]);
  const [engineNote, setEngineNote] = useState("");

  const host = useMemo(() => (url.trim() ? detectHost(normalizePaste(url)) : "unknown"), [url]);

  useEffect(() => {
    void sessionStatusFn({ data: {} }).then(setSession).catch(() => undefined);
    let stop = false;
    let n = 0;
    async function tick() {
      try {
        const data = (await fetch("/api/status").then((r) => r.json())) as {
          hosts?: Array<{ host: string; state: string; note: string; latencyMs: number }>;
          summary?: string;
          checkedAt?: number;
          learning?: boolean;
        };
        if (stop) return;
        if (Array.isArray(data.hosts)) setPulses(data.hosts);
        if (data.checkedAt && typeof data.summary === "string") setEngineNote(data.summary);
        const pending = Boolean(data.learning) || (data.hosts || []).some((h) => h.state === "unknown");
        n += 1;
        if (pending && n < 6) window.setTimeout(tick, 8000);
      } catch {
        /* status is optional */
      }
    }
    void tick();
    return () => {
      stop = true;
    };
  }, []);

  async function run(nextUrl = url) {
    const trimmed = normalizePaste(nextUrl);
    if (!trimmed) return;
    setUrl(trimmed);
    setBusy(true);
    setResult(null);
    try {
      const data = await resolveLink({ data: { url: trimmed, cookie } });
      setResult(data);
      void reportUsage({
        kind: "share",
        host: usageHost(trimmed),
        outcome: data.ok ? "ok" : "fail",
        fileCount: data.ok ? data.files.length : 0,
        elapsedMs: data.elapsedMs || 0,
        device: deviceKind(),
      });
      if (data.ok) {
        setHistory(
          pushHistory({
            url: trimmed,
            title: data.title,
            host: data.host,
            at: Date.now(),
            fileCount: data.files.length,
          }),
        );
      }
    } catch (err) {
      setResult({
        ok: false,
        host: detectHost(trimmed),
        inputUrl: trimmed,
        error: err instanceof Error ? err.message : "Resolve failed",
        elapsedMs: 0,
      });
    } finally {
      setBusy(false);
    }
  }

  async function doLogin() {
    setLoginBusy(true);
    setLoginMsg(null);
    try {
      const res = await loginTeraboxFn({ data: { email, password } });
      if (res.ok) {
        setSession({ active: true, emailMasked: res.emailMasked, ndusTail: res.ndusTail });
        setCookie(res.cookie);
        saveCookie(res.cookie);
        setPassword("");
        setLoginMsg(`Signed in as ${res.emailMasked}. Original TeraBox downloads can use this session.`);
      } else {
        setLoginMsg(res.error + (res.hint ? ` ${res.hint}` : ""));
      }
    } catch (err) {
      setLoginMsg(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginBusy(false);
    }
  }

  async function runPack(nextUrl = packUrl) {
    const trimmed = normalizePaste(nextUrl);
    if (!trimmed) return;
    setPackUrl(trimmed);
    setPackBusy(true);
    setPack(null);
    try {
      const data = await resolvePackFn({ data: { url: trimmed } });
      setPack(data);
      void reportUsage({
        kind: "pack",
        host: usageHost(trimmed),
        outcome: data.ok ? "ok" : "fail",
        fileCount: data.ok ? data.files.length : 0,
        elapsedMs: data.elapsedMs || 0,
        device: deviceKind(),
      });
    } catch (err) {
      setPack({
        ok: false,
        host: detectHost(trimmed),
        inputUrl: trimmed,
        error: err instanceof Error ? err.message : "Pack collect failed",
        elapsedMs: 0,
      });
    } finally {
      setPackBusy(false);
    }
  }

  async function saveEach() {
    if (!pack || !pack.ok) return;
    setSavingEach(true);
    try {
      for (const file of pack.files) {
        if (!file.mediaId) continue;
        const a = document.createElement("a");
        a.href = `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`;
        a.download = file.name;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 700));
      }
    } finally {
      setSavingEach(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader
        active="home"
        extra={
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-fg"
            aria-label="Settings"
          >
            <Settings2 className="size-5" />
          </button>
        }
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-5 pb-24">
        <section className="flex flex-col gap-5 pt-4">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">TeraBox · Diskwala · Blatim</p>
          <h1 className="font-display text-4xl leading-tight tracking-tight text-fg sm:text-5xl">
            Paste the link.
            <br />
            Skip the ads.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted">
            Public share pages bury the file behind timers, app installs and popups. Skipper reads the
            share on the server, lists every file, and plays or downloads the original — no TeraBox
            app, no Diskwala install, no Blatim / Broadcaster login, no ads. Paste a messy Telegram
            post, a teraboxlinke.com/v/ hop, or a folder link in Pack below.
          </p>
          {pulses.length ? (
            <ul className="flex flex-wrap gap-2">
              {pulses.map((p) => (
                <li
                  key={p.host}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted"
                  title={p.note}
                >
                  <span
                    className={
                      p.state === "live" ? "text-ok" : p.state === "down" ? "text-fg" : "text-muted"
                    }
                  >
                    {p.state === "live" ? "Live" : p.state === "down" ? "Down" : p.state === "slow" ? "Slow" : "…"}
                  </span>{" "}
                  {p.host}
                </li>
              ))}
            </ul>
          ) : null}
          {engineNote ? <p className="max-w-xl text-sm leading-relaxed text-muted">{engineNote}</p> : null}
        </section>

        <Link
          to="/any"
          className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-4 active:bg-elevated"
        >
          <span className="min-w-0">
            <span className="block text-base text-fg">Download from any site</span>
            <span className="mt-1 block text-sm leading-snug text-muted">
              Paste any page. Skipper lists every public video on it, then plays or saves them. One tap on your phone.
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-muted" aria-hidden />
        </Link>

        {settingsOpen ? (
          <section className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-5">
            <div>
              <h2 className="text-sm font-medium text-fg">TeraBox account (optional)</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Listing, Play and Download already work without an account via a public original-file
                worker. Signing in mints an <span className="font-mono">ndus</span> cookie so Skipper
                can also hit TeraBox's own download API. The password is sent once, never stored.
                TeraBox may show a slide captcha — if it does, paste ndus from your browser instead.
              </p>
              {session.active ? (
                <p className="mt-3 text-sm text-ok">
                  Session active{session.emailMasked ? ` · ${session.emailMasked}` : ""} · ndus …{session.ndusTail}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="TeraBox email"
                  className="h-11 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:outline-2 focus:outline-accent"
                />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-11 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:outline-2 focus:outline-accent"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={loginBusy || !email || !password} onClick={() => void doLogin()}>
                  {loginBusy ? "Signing in…" : "Sign in and harvest ndus"}
                </Button>
                {session.active ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void logoutTeraboxFn({ data: {} });
                      setSession({ active: false, emailMasked: "", ndusTail: "" });
                    }}
                  >
                    Sign out
                  </Button>
                ) : null}
              </div>
              {loginMsg ? <p className="mt-3 text-sm leading-relaxed text-muted">{loginMsg}</p> : null}
            </div>
            <div>
              <h2 className="text-sm font-medium text-fg">Or paste an ndus cookie</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                From a browser already logged into TeraBox: DevTools → Application → Cookies →{" "}
                <span className="font-mono">ndus</span>. Stored in this browser only.
              </p>
              <textarea
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="ndus=Y……"
                rows={3}
                className="mt-4 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:outline-2 focus:outline-accent"
              />
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    saveCookie(cookie);
                    setSettingsOpen(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCookie("");
                    saveCookie("");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("share-url") as HTMLInputElement | null;
            void run(input?.value || url);
          }}
        >
          <label className="text-sm text-muted" htmlFor="share-url">
            Share link
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="share-url"
              name="share-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                const picked = normalizePaste(text);
                if (!picked) return;
                e.preventDefault();
                setUrl(picked);
                void run(picked);
              }}
              placeholder="Paste TeraBox, Diskwala, Blatim or a Telegram post…"
              autoComplete="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-4 text-base text-fg outline-none placeholder:text-subtle focus:outline-2 focus:outline-offset-0 focus:outline-accent"
            />
            <Button type="submit" size="lg" disabled={busy || !url.trim()} className="sm:w-40">
              {busy ? "Opening…" : "Open"}
              {!busy ? <ArrowRight className="size-4" /> : null}
            </Button>
          </div>
          <p className="text-xs text-subtle">
            {host === "unknown" && url.trim()
              ? "Looking for a share URL in that paste…"
              : host === "terabox"
                ? "TeraBox share — every mirror (/s/ and /v/), original file on the first Open."
                : host === "diskwala"
                  ? "Diskwala share — Skipper skips their fake 404 and races /app plus /playlist for albums."
                  : host === "blatim"
                    ? "Blatim watch — Skipper reads /api/video info (no app, no ads) and follows the original VidBunker / TeraBox / Diskwala file."
                    : host === "telegram"
                      ? "Telegram post — Skipper reads the public preview and opens the nested TeraBox / Diskwala / Blatim link."
                      : "Supports TeraBox (all mirrors), Diskwala, Blatim and Telegram pastes."}
          </p>
        </form>

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              type="button"
              onClick={() => void run(ex.url)}
              className="h-9 rounded-full border border-border px-3 text-sm text-muted hover:border-accent hover:text-fg"
            >
              {ex.label}
            </button>
          ))}
        </div>

        {busy ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <div className="h-28 animate-pulse rounded-lg bg-surface" />
            <p className="text-sm text-muted">Reading the share and minting the original file…</p>
          </div>
        ) : null}

        {result && !result.ok ? (
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="font-medium text-fg">{result.error}</p>
            {result.hint ? <p className="mt-2 text-sm leading-relaxed text-muted">{result.hint}</p> : null}
          </div>
        ) : null}

        {result && result.ok ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted">{result.host}</p>
                <h2 className="mt-1 font-display text-2xl text-fg">{result.title}</h2>
              </div>
              <p className="text-sm text-subtle">{result.elapsedMs} ms</p>
            </div>
            {result.warnings.map((w) => (
              <p key={w} className="text-sm text-muted">
                {w}
              </p>
            ))}
            <div className="flex flex-col gap-3">
              {result.files.map((file) => (
                <FileCard key={file.id + file.path} file={file} onPlay={setPlaying} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-elevated text-muted">
              <Package className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">TeraBox · Diskwala · Blatim</p>
              <h2 className="mt-1 font-display text-2xl tracking-tight text-fg">Folder Pack</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Paste one public share. Pack pages every folder that share published — TeraBox
                extra pages and nested folders, Diskwala albums on the same storage, or a Blatim
                watch that wraps those hosts. Play any file or zip the tree. The rest of that
                uploader’s account is private and is not opened.
              </p>
            </div>
          </div>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("pack-url") as HTMLInputElement | null;
              void runPack(input?.value || packUrl);
            }}
          >
            <label className="text-sm text-muted" htmlFor="pack-url">
              Folder or album link
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="pack-url"
                name="pack-url"
                value={packUrl}
                onChange={(e) => setPackUrl(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  const picked = normalizePaste(text);
                  if (!picked) return;
                  e.preventDefault();
                  setPackUrl(picked);
                  void runPack(picked);
                }}
                placeholder="Paste a folder, album, Telegram post or watch link…"
                autoComplete="off"
                spellCheck={false}
                className="h-12 min-w-0 flex-1 rounded-md border border-border bg-bg px-4 text-base text-fg outline-none placeholder:text-subtle focus:outline-2 focus:outline-offset-0 focus:outline-accent"
              />
              <Button type="submit" size="lg" disabled={packBusy || !packUrl.trim()} className="sm:w-44">
                {packBusy ? "Collecting…" : "Collect pack"}
                {!packBusy ? <Package className="size-4" /> : null}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={`pack-${ex.url}`}
                  type="button"
                  onClick={() => void runPack(ex.url)}
                  className="h-9 rounded-full border border-border px-3 text-sm text-muted hover:border-accent hover:text-fg"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </form>

          {packBusy ? (
            <div className="flex flex-col gap-3" aria-live="polite">
              <div className="h-20 animate-pulse rounded-lg bg-elevated" />
              <p className="text-sm text-muted">Walking the album and minting every original file…</p>
            </div>
          ) : null}

          {pack && !pack.ok ? (
            <div className="rounded-md border border-border bg-bg p-4">
              <p className="font-medium text-fg">{pack.error}</p>
              {pack.hint ? <p className="mt-2 text-sm leading-relaxed text-muted">{pack.hint}</p> : null}
            </div>
          ) : null}

          {pack && pack.ok ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted">
                    {pack.files.length} file{pack.files.length === 1 ? "" : "s"}
                    {pack.totalBytes ? ` · ${formatBytes(pack.totalBytes)}` : ""}
                  </p>
                  <h3 className="mt-1 font-display text-xl text-fg">{pack.title}</h3>
                </div>
                <p className="text-sm text-subtle">{pack.elapsedMs} ms</p>
              </div>
              {pack.warnings.map((w) => (
                <p key={w} className="text-sm text-muted">
                  {w}
                </p>
              ))}
              <div className="flex flex-wrap gap-2">
                {pack.packId ? (
                  <a
                    href={`/api/pack?id=${encodeURIComponent(pack.packId)}`}
                    download={`${pack.title || "folder-pack"}.zip`}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg",
                    )}
                  >
                    <Package className="size-4" />
                    Download all as zip
                  </a>
                ) : null}
                <Button type="button" size="sm" variant="secondary" disabled={savingEach} onClick={() => void saveEach()}>
                  {savingEach ? "Saving…" : "Save each file"}
                </Button>
              </div>
              <p className="text-xs text-subtle">
                Zip is one click. Save each asks the browser to download originals one after another —
                allow multiple downloads if it prompts.
              </p>
              <div className="flex flex-col gap-3">
                {pack.files.map((file) => (
                  <FileCard key={file.id + file.path} file={file} onPlay={setPlaying} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {history.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
                <Clock className="size-4" />
                Recent
              </h2>
              <button
                type="button"
                className="text-sm text-subtle hover:text-fg"
                onClick={() => {
                  clearHistory();
                  setHistory([]);
                }}
              >
                Clear
              </button>
            </div>
            <ul className="flex flex-col gap-1">
              {history.map((h) => (
                <li key={h.url}>
                  <button
                    type="button"
                    onClick={() => void run(h.url)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left hover:bg-surface",
                    )}
                  >
                    <span className="min-w-0 truncate text-sm text-fg">{h.title}</span>
                    <span className="shrink-0 text-xs uppercase text-subtle">{h.host}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <Fact
            icon={<Zap className="size-4" />}
            title="Original file, no login"
            body="A public worker already holds a TeraBox cookie pool. We mint a direct MP4 (Range + full size) and stream it through Skipper so Play actually plays."
          />
          <Fact
            icon={<Shield className="size-4" />}
            title="Same-origin proxy"
            body="Bytes are piped from the CDN through this app so the player is not blocked by attachment headers or iframe download rules."
          />
          <Fact
            icon={<Settings2 className="size-4" />}
            title="Account is optional"
            body="Email + password in Settings harvests ndus for TeraBox's own API. Captcha may block that path. Public Play/Download does not need it."
          />
        </section>
        <p className="text-center text-sm text-subtle">
          <a href="/skipper-source.zip" className="hover:text-fg">
            Download source
          </a>
          {" · "}
          <a href="/docs/AI_HANDOFF_PROMPT.md" className="hover:text-fg">
            Handoff for the next builder
          </a>
          {" · "}
          <a href="/docs/COMPLETE_BUILD_GUIDE.md" className="hover:text-fg">
            A–Z guide
          </a>
        </p>
      </main>

      {playing ? <StreamPlayer file={playing} onClose={() => setPlaying(null)} /> : null}
    </div>
  );
}

function Fact({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-muted">{icon}</div>
      <h3 className="mt-3 text-sm font-medium text-fg">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
