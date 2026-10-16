import { createFileRoute } from "@tanstack/react-router";
import { fetchTeraboxDlink, fetchTeraboxPlaylist } from "@/lib/extractors/terabox";
import { getMedia } from "@/lib/extractors/media-cache";
import { proxyMedia } from "@/lib/extractors/proxy";
import { isAllowedCdn } from "@/lib/extractors/cdn";
import { refererFor } from "@/lib/extractors/media-cache";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const mode = u.searchParams.get("mode") ?? "stream";
        const name = u.searchParams.get("name") ?? "file";
        const uk = u.searchParams.get("uk") ?? "";
        const shareId = u.searchParams.get("shareid") ?? "";
        const fid = u.searchParams.get("fid") ?? "";
        const cookie = u.searchParams.get("cookie") ?? "";
        const direct = u.searchParams.get("direct") ?? "";
        const mediaId = u.searchParams.get("id") ?? "";

        if (mediaId) {
          const entry = getMedia(mediaId);
          if (!entry?.directUrl) {
            return Response.json({ error: "Media link expired. Open the share again." }, { status: 410 });
          }
          return Response.redirect(entry.directUrl, 302);
        }

        if (direct) {
          if (!isAllowedCdn(direct)) return Response.json({ error: "blocked host" }, { status: 400 });
          return proxyMedia({
            url: direct,
            request,
            filename: name,
            referer: refererFor(direct, "https://www.teraboxdl.site/"),
            asDownload: true,
          });
        }

        if (mode === "original" && cookie && uk && shareId && fid) {
          const dlink = await fetchTeraboxDlink({ uk, shareId, fsId: fid, cookie });
          if (dlink) {
            return proxyMedia({
              url: dlink,
              request,
              filename: name,
              referer: "https://www.1024tera.com/",
              asDownload: true,
            });
          }
        }

        if (!uk || !shareId || !fid) {
          return Response.json({ error: "missing file ids" }, { status: 400 });
        }

        const playlist = await fetchTeraboxPlaylist(uk, shareId, fid);
        if ("error" in playlist) {
          return Response.json({ error: playlist.error }, { status: 502 });
        }
        const segments = playlist.playlist.split("\n").filter((l) => l.startsWith("http"));
        if (!segments.length) {
          return Response.json({ error: "empty playlist" }, { status: 502 });
        }
        const filename = name.replace(/[^\w.\- ()[\]]+/g, "_");
        const stream = concatSegments(segments);
        return new Response(stream, {
          headers: {
            "content-type": "video/mp2t",
            "content-disposition": `attachment; filename="${filename.replace(/\.[^.]+$/, "")}.ts"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});

function concatSegments(urls: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for (const url of urls) {
          const res = await fetch(url, {
            headers: { "user-agent": UA, referer: "https://www.1024tera.com/" },
          });
          if (!res.body) continue;
          const reader = res.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) controller.enqueue(value);
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
