import { createFileRoute } from "@tanstack/react-router";
import { findPublicVideos } from "@/lib/extractors/any-video";
import { getMedia, getPack } from "@/lib/extractors/media-cache";
import { fetchPublic } from "@/lib/extractors/proxy";
import { zipStoreStream } from "@/lib/extractors/zip-store";

export const Route = createFileRoute("/api/any")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { url?: string };
        const url = typeof body.url === "string" ? body.url : "";
        if (!url.trim()) {
          return Response.json({
            ok: false,
            host: "unknown",
            inputUrl: "",
            error: "Paste a link.",
            elapsedMs: 0,
          });
        }
        try {
          return Response.json(await findPublicVideos(url));
        } catch (err) {
          return Response.json({
            ok: false,
            host: "unknown",
            inputUrl: url,
            error: err instanceof Error ? err.message : "Could not read that page.",
            elapsedMs: 0,
          });
        }
      },
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("pack") ?? "";
        const pack = id ? getPack(id) : null;
        if (!pack) {
          return Response.json({ error: "That download expired. Find the page again." }, { status: 410 });
        }
        const zipName = `${(pack.title || "videos").replace(/[^\w.\- ]+/g, "_").slice(0, 60) || "videos"}.zip`;
        const stream = zipStoreStream(
          pack.files.slice(0, 12).map((f) => ({
            name: f.name,
            open: async () => {
              const entry = getMedia(f.mediaId);
              if (!entry?.publicDirect || !entry.directUrl) return null;
              const got = await fetchPublic(entry.directUrl, { referer: entry.referer, timeoutMs: 20000 });
              if (!got?.res.ok || !got.res.body) return null;
              const ctype = got.res.headers.get("content-type") || "";
              if (/text\/html|javascript|\/json/i.test(ctype)) {
                try {
                  await got.res.body.cancel();
                } catch {
                  /* ignore */
                }
                return null;
              }
              return got.res.body as ReadableStream<Uint8Array>;
            },
          })),
        );
        return new Response(stream, {
          headers: {
            "content-type": "application/zip",
            "content-disposition": `attachment; filename="${zipName}"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
