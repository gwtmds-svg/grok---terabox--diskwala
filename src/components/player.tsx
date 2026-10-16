import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { ResolvedFile } from "@/lib/extractors/types";
import { formatBytes, formatDuration } from "@/lib/utils";

export function StreamPlayer({ file, onClose }: { file: ResolvedFile; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Loading original…");
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: Hls | null = null;
    let cancelled = false;
    let attempt = 0;

    const sources = buildSources(file);

    const setSrcDirect = (url: string) => {
      video.src = url;
      void video.play().catch(() => {
        /* autoplay may be blocked until the user hits play */
      });
    };

    const setSrcHls = (url: string) => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        setSrcDirect(url);
        return;
      }
      if (!Hls.isSupported()) {
        setFailed("This browser cannot play HLS.");
        return;
      }
      hls?.destroy();
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        startLevel: -1,
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) tryNext();
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    };

    const tryNext = () => {
      if (cancelled) return;
      const next = sources[attempt++];
      if (!next) {
        setFailed("Could not start playback. Try Download — it saves the original file.");
        setStatus("Playback failed");
        return;
      }
      setStatus(next.label);
      setFailed(null);
      if (next.kind === "hls") setSrcHls(next.url);
      else setSrcDirect(next.url);
    };

    const onError = () => tryNext();
    const onMeta = () => {
      const d = video.duration;
      const nice = Number.isFinite(d) && d > 0 ? formatDuration(d) : "";
      setStatus(nice ? `Playing${nice ? ` · ${nice}` : ""}` : "Playing");
    };

    video.addEventListener("error", onError);
    video.addEventListener("loadedmetadata", onMeta);
    tryNext();

    return () => {
      cancelled = true;
      video.removeEventListener("error", onError);
      video.removeEventListener("loadedmetadata", onMeta);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [file]);

  const downloadHref = file.mediaId
    ? `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4">
      <div className="flex w-full max-w-4xl flex-col gap-3 rounded-xl bg-surface p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-fg">{file.name}</p>
            <p className="text-sm text-muted">
              {status}
              {file.size ? ` · ${formatBytes(file.size)}` : ""}
            </p>
            {failed ? <p className="mt-1 text-sm text-muted">{failed}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {downloadHref ? (
              <a
                href={downloadHref}
                download={file.name}
                className="inline-flex h-11 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
              >
                Download
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="size-11 shrink-0 rounded-md text-muted hover:bg-elevated hover:text-fg"
              aria-label="Close player"
            >
              Close
            </button>
          </div>
        </div>
        <video
          ref={ref}
          controls
          autoPlay
          playsInline
          preload="auto"
          className="aspect-video w-full rounded-md bg-bg"
        />
      </div>
    </div>
  );
}

type Source = { url: string; kind: "mp4" | "hls"; label: string };

function buildSources(file: ResolvedFile): Source[] {
  const out: Source[] = [];
  // Same-origin Range proxy only. The worker URL sends Content-Disposition:
  // attachment, which Chrome will not play inside <video>.
  if (file.mediaId && file.directUrl) {
    out.push({
      url: `/api/file?id=${encodeURIComponent(file.mediaId)}`,
      kind: "mp4",
      label: "Loading original file…",
    });
  }
  if (file.mediaId && file.hlsUrl) {
    out.push({
      url: `/api/hls?id=${encodeURIComponent(file.mediaId)}`,
      kind: "hls",
      label: "Loading full stream…",
    });
  }
  if (file.uk && file.shareId && file.fsId) {
    const q = new URLSearchParams({
      uk: file.uk,
      shareid: file.shareId,
      fid: file.fsId,
    });
    out.push({ url: `/api/hls?${q.toString()}`, kind: "hls", label: "Loading preview stream…" });
  }
  return out;
}
