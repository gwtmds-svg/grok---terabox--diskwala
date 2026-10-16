import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import type { ResolveResult, ResolvedFile } from "@/lib/extractors/types";
import type { UsageSummary } from "@/lib/usage-client";
import { deviceKind, reportUsage, usageHost } from "@/lib/usage-client";
import { normalizePaste } from "@/lib/extractors/parse-url";
import { SiteHeader } from "@/components/site-header";

const StreamPlayer = lazy(() =>
  import("@/components/player").then((m) => ({ default: m.StreamPlayer })),
);

export const Route = createFileRoute("/any")({ component: AnyVideo });

const SAMPLE_FILE = "https://www.w3schools.com/html/mov_bbb.mp4";
const SAMPLE_PAGE = "https://www.w3schools.com/html/html5_video.asp";

function AnyVideo() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [playing, setPlaying] = useState<ResolvedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<UsageSummary | null>(null);

  function loadStats() {
    void fetch("/api/usage")
      .then((r) => r.json())
      .then((data: UsageSummary) => setStats(data))
      .catch(() => undefined);
  }

  useEffect(() => {
    const idle = window.requestIdleCallback?.bind(window);
    let timer = 0;
    if (idle) {
      const id = idle(() => loadStats(), { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    timer = window.setTimeout(loadStats, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  async function run(next = url) {
    const trimmed = normalizePaste(next);
    if (!trimmed) return;
    setUrl(trimmed);
    setBusy(true);
    setResult(null);
    setPlaying(null);
    const started = Date.now();
    try {
      const data = (await fetch("/api/any", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      }).then((r) => r.json())) as ResolveResult;
      setResult(data);
      void reportUsage({
        kind: "any",
        host: usageHost(trimmed),
        outcome: data.ok ? "ok" : "fail",
        fileCount: data.ok ? data.files.length : 0,
        elapsedMs: data.elapsedMs || Date.now() - started,
        device: deviceKind(),
      }).then(loadStats);
    } catch (err) {
      setResult({
        ok: false,
        host: "unknown",
        inputUrl: trimmed,
        error: err instanceof Error ? err.message : "Could not read that page.",
        elapsedMs: Date.now() - started,
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    if (!result?.ok) return;
    if (result.packId) {
      window.location.assign(`/api/any?pack=${encodeURIComponent(result.packId)}`);
      return;
    }
    setSaving(true);
    try {
      for (const file of result.files) {
        if (!file.mediaId || !file.directUrl) continue;
        const a = document.createElement("a");
        a.href = `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`;
        a.download = file.name;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 450));
      }
    } finally {
      setSaving(false);
    }
  }

  const files = result?.ok ? result.files : [];
  const canZip = Boolean(result?.ok && result.packId);
  const canSaveMany = files.filter((f) => f.mediaId && f.directUrl).length > 1;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="any" />
      <main
        className={`mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-4 sm:gap-8 sm:px-5 ${
          canSaveMany ? "pb-28 sm:pb-24" : "pb-[max(4rem,env(safe-area-inset-bottom))]"
        }`}
      >
        <section className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Any website</p>
          <h1 className="font-display text-[2rem] leading-tight tracking-tight sm:text-5xl">
            Every public video on the page.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted">
            Paste a link once. Skipper reads that page, follows its player frame, and lists the video
            files it actually publishes. Play here, or save them — several files come down as one zip.
          </p>
        </section>

        <form
          className="flex flex-col gap-2 sm:flex-row sm:gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <label className="sr-only" htmlFor="any-url">
            Video or page link
          </label>
          <input
            id="any-url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (!text.trim()) return;
              e.preventDefault();
              setUrl(text);
              void run(text);
            }}
            placeholder="Paste a page or a video file"
            inputMode="url"
            enterKeyHint="go"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-base text-fg outline-none placeholder:text-subtle focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="h-12 shrink-0 rounded-md bg-accent px-5 text-base font-medium text-accent-fg disabled:opacity-50"
          >
            {busy ? "Reading…" : "Find videos"}
          </button>
        </form>

        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => void run(SAMPLE_FILE)}
            className="inline-flex h-11 shrink-0 items-center rounded-full border border-border px-3 text-sm text-muted hover:text-fg"
          >
            Sample file
          </button>
          <button
            type="button"
            onClick={() => void run(SAMPLE_PAGE)}
            className="inline-flex h-11 shrink-0 items-center rounded-full border border-border px-3 text-sm text-muted hover:text-fg"
          >
            Sample page
          </button>
        </div>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Usage">
          <Stat label="Today" value={stats ? String(stats.today) : "—"} />
          <Stat label="Worked" value={stats ? String(stats.ok) : "—"} />
          <Stat label="Files" value={stats ? String(stats.files) : "—"} />
          <Stat label="Phone" value={stats ? String(stats.mobile) : "—"} />
        </section>
        <p className="-mt-3 text-sm leading-relaxed text-muted">
          {stats?.backend === "neon"
            ? "Counts are in your database."
            : "Counts stay on this server until you host and connect a database."}{" "}
          Site name, success, and speed only — never the link you pasted.
          {stats?.hosts?.length ? ` Recent: ${stats.hosts.map((h) => h.host).join(", ")}.` : ""}
        </p>

        {busy ? (
          <p className="text-sm text-muted" role="status">
            Reading the page…
          </p>
        ) : null}

        {result && !result.ok ? (
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-base text-fg">{result.error}</p>
            {result.hint ? <p className="mt-2 text-sm leading-relaxed text-muted">{result.hint}</p> : null}
          </div>
        ) : null}

        {result?.ok ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl text-fg">{result.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {files.length} video{files.length === 1 ? "" : "s"} · {result.elapsedMs} ms
                </p>
              </div>
              {canSaveMany ? (
                <button
                  type="button"
                  onClick={() => void saveAll()}
                  disabled={saving}
                  className="hidden h-11 rounded-md border border-border px-4 text-sm text-fg disabled:opacity-50 sm:inline-flex sm:items-center"
                >
                  {saving ? "Saving…" : canZip ? "Download all" : "Download each"}
                </button>
              ) : null}
            </div>
            {result.warnings.map((w) => (
              <p key={w} className="text-sm leading-relaxed text-muted">
                {w}
              </p>
            ))}
            <ul className="flex flex-col gap-3">
              {files.map((file) => (
                <li key={file.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
                  <div className="min-w-0">
                    <p className="truncate text-base text-fg" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {file.directUrl ? "Video file" : "Stream"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!file.canStream || !file.mediaId}
                      onClick={() => setPlaying(file)}
                      className="h-12 rounded-md bg-accent text-base font-medium text-accent-fg disabled:opacity-50"
                    >
                      Play
                    </button>
                    {file.mediaId && file.directUrl ? (
                      <a
                        href={`/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`}
                        download={file.name}
                        className="inline-flex h-12 items-center justify-center rounded-md border border-border text-base text-fg"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="inline-flex h-12 items-center justify-center text-sm text-muted">
                        Play only
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      {canSaveMany ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur sm:hidden">
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving}
            className="h-12 w-full rounded-md bg-accent text-base font-medium text-accent-fg disabled:opacity-50"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            {saving ? "Saving…" : canZip ? "Download all" : "Download each"}
          </button>
        </div>
      ) : null}

      {playing ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 text-fg">
              Opening player…
            </div>
          }
        >
          <StreamPlayer file={playing} onClose={() => setPlaying(null)} />
        </Suspense>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-fg">{value}</p>
    </div>
  );
}
