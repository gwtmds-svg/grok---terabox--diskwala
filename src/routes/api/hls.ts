import { createFileRoute } from "@tanstack/react-router";
import { fetchTeraboxPlaylist } from "@/lib/extractors/terabox";
import { rewritePlaylist } from "@/lib/extractors/playlist";
import { allowSegments, getMedia, refererFor } from "@/lib/extractors/media-cache";
import { MEDIA_UA, isAllowedCdn } from "@/lib/extractors/cdn";
import { isPublicHttpUrl } from "@/lib/extractors/public-url";

export const Route = createFileRoute("/api/hls")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const id = u.searchParams.get("id") ?? "";
        const uk = u.searchParams.get("uk") ?? "";
        const shareId = u.searchParams.get("shareid") ?? "";
        const fid = u.searchParams.get("fid") ?? "";
        const type = u.searchParams.get("type") ?? "M3U8_AUTO_480";

        let playlist = "";
        if (id) {
          const entry = getMedia(id);
          if (!entry?.hlsUrl) {
            return Response.json({ error: "HLS link expired. Open the share again." }, { status: 410 });
          }
          if (entry.publicDirect) {
            if (!(await isPublicHttpUrl(entry.hlsUrl))) {
              return Response.json({ error: "blocked host" }, { status: 400 });
            }
          } else if (!isAllowedCdn(entry.hlsUrl)) {
            return Response.json({ error: "blocked host" }, { status: 400 });
          }
          const res = await fetch(entry.hlsUrl, {
            headers: {
              "user-agent": MEDIA_UA,
              referer: entry.referer || refererFor(entry.hlsUrl, "https://www.teraboxdl.site/"),
              accept: "*/*",
            },
            redirect: "follow",
          });
          playlist = await res.text();
          if (!playlist.includes("#EXTM3U")) {
            return Response.json({ error: "upstream did not return a playlist" }, { status: 502 });
          }
          if (entry.publicDirect) {
            allowSegments(id, [entry.hlsUrl]);
            const rewritten = rewritePlaylist(playlist, entry.hlsUrl, id, u.origin);
            return new Response(rewritten, {
              headers: {
                "content-type": "application/vnd.apple.mpegurl",
                "cache-control": "no-store",
                "access-control-allow-origin": "*",
              },
            });
          }
        } else {
          if (!uk || !shareId || !fid) {
            return Response.json({ error: "uk, shareid, fid or id required" }, { status: 400 });
          }
          const result = await fetchTeraboxPlaylist(uk, shareId, fid, type);
          if ("error" in result) {
            return Response.json({ error: result.error }, { status: 502 });
          }
          playlist = result.playlist;
        }

        const origin = u.origin;
        const rewritten = playlist
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("http")) {
              return `${origin}/api/seg?u=${encodeURIComponent(trimmed)}`;
            }
            return line;
          })
          .join("\n");
        return new Response(rewritten, {
          headers: {
            "content-type": "application/vnd.apple.mpegurl",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
