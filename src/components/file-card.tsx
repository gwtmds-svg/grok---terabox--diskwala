import { Download, Folder, Play } from "lucide-react";
import type { ResolvedFile } from "@/lib/extractors/types";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import { Button, buttonVariants } from "./ui/button";

export function FileCard({
  file,
  onPlay,
}: {
  file: ResolvedFile;
  onPlay: (file: ResolvedFile) => void;
}) {
  const thumb = file.thumbnail ? `/api/thumb?u=${encodeURIComponent(file.thumbnail)}` : null;
  const downloadHref = buildDownloadHref(file);
  const canPlay = file.canStream || Boolean(file.directUrl || file.hlsUrl || file.mediaId);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface sm:flex-row">
      <div className="relative aspect-video w-full shrink-0 bg-elevated sm:aspect-auto sm:w-44">
        {thumb ? (
          <img src={thumb} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full min-h-28 items-center justify-center text-subtle">
            {file.isDir ? <Folder className="size-8" /> : <Play className="size-8" />}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-fg" title={file.name}>
            {file.name}
          </h3>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            <span>{file.isDir ? "Folder" : formatBytes(file.size)}</span>
            {file.duration ? <span>{formatDuration(file.duration)}</span> : null}
            {file.width && file.height ? (
              <span>
                {file.width}×{file.height}
              </span>
            ) : null}
            <span className="uppercase tracking-wide">{file.host}</span>
            {file.originalReady ? <span className="text-ok">Original ready</span> : null}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {canPlay ? (
            <Button type="button" size="sm" onClick={() => onPlay(file)}>
              <Play className="size-4" />
              Play
            </Button>
          ) : null}
          {!file.isDir && downloadHref ? (
            <a
              href={downloadHref}
              download={file.name}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              <Download className="size-4" />
              Download
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function buildDownloadHref(file: ResolvedFile): string | null {
  if (file.mediaId) return `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`;
  if (file.uk && file.shareId && file.fsId) {
    const params = new URLSearchParams({
      name: file.name,
      uk: file.uk,
      shareid: file.shareId,
      fid: file.fsId,
      mode: "stream",
    });
    return `/api/download?${params.toString()}`;
  }
  return null;
}
