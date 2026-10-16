import { createFileRoute } from "@tanstack/react-router";
import { getMedia } from "@/lib/extractors/media-cache";
import { corsPreflight, proxyMedia } from "@/lib/extractors/proxy";

export const Route = createFileRoute("/api/file")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      HEAD: (ctx) => handle(ctx.request),
      GET: (ctx) => handle(ctx.request),
    },
  },
});

async function handle(request: Request): Promise<Response> {
  const u = new URL(request.url);
  const id = u.searchParams.get("id") ?? "";
  const asDownload = u.searchParams.get("dl") === "1";
  const entry = id ? getMedia(id) : null;

  if (!entry) {
    return Response.json(
      { error: "Media link expired. Open the share again to mint a fresh one." },
      { status: 410 },
    );
  }

  const target = entry.directUrl || entry.hlsUrl;
  if (!target) {
    return Response.json({ error: "No media URL on this file." }, { status: 404 });
  }

  // Always proxy through this origin. A 302 to the worker sends
  // Content-Disposition: attachment (Chrome then will not <video> play it)
  // and Grok's preview iframe often blocks the cross-origin navigation.
  return proxyMedia({
    url: target,
    request,
    filename: entry.name,
    referer: entry.referer,
    asDownload,
    publicDirect: Boolean(entry.publicDirect),
  });
}
