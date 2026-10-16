import { createFileRoute } from "@tanstack/react-router";
import { getMedia, getPack } from "@/lib/extractors/media-cache";
import { corsPreflight } from "@/lib/extractors/proxy";
import { isAllowedCdn, MEDIA_UA } from "@/lib/extractors/cdn";
import { zipStoreStream } from "@/lib/extractors/zip-store";
import { resolvePack } from "@/lib/extractors/pack";

export const Route = createFileRoute("/api/pack")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { url?: string };
        const url = typeof body.url === "string" ? body.url : "";
        if (!url) return Response.json({ ok: false, error: "url required" }, { status: 400 });
        try {
          return Response.json(await resolvePack(url));
        } catch (err) {
          return Response.json(
            {
              ok: false,
              host: "unknown",
              inputUrl: url,
              error: err instanceof Error ? err.message : "Pack collect failed",
              elapsedMs: 0,
            },
            { status: 200 },
          );
        }
      },
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") ?? "";
        const pack = id ? getPack(id) : null;
        if (!pack) {
          return Response.json(
            { error: "Pack expired. Collect the folder link again." },
            { status: 410 },
          );
        }

        const zipName = `${(pack.title || "folder-pack").replace(/[^\w.\- ]+/g, "_").slice(0, 60)}.zip`;
        const stream = zipStoreStream(
          pack.files.map((f) => ({
            name: f.name,
            open: async () => {
              const entry = getMedia(f.mediaId);
              const url = entry?.directUrl;
              if (!url || !isAllowedCdn(url)) return null;
              const res = await fetch(url, {
                headers: {
                  "user-agent": MEDIA_UA,
                  accept: "*/*",
                  referer: entry.referer,
                },
                redirect: "follow",
              });
              if (!res.ok || !res.body) return null;
              return res.body as ReadableStream<Uint8Array>;
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
