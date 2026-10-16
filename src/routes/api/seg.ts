import { createFileRoute } from "@tanstack/react-router";
import { MEDIA_UA, isAllowedCdn } from "@/lib/extractors/cdn";
import { getMedia, refererFor, segmentAllowed } from "@/lib/extractors/media-cache";
import { rewritePlaylist } from "@/lib/extractors/playlist";
import { corsPreflight, fetchPublic } from "@/lib/extractors/proxy";

export const Route = createFileRoute("/api/seg")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const target = u.searchParams.get("u");
        const id = u.searchParams.get("id") ?? "";
        if (id) return proxyOwnedSegment(request, id, target, u.origin);
        if (!target || !isAllowedCdn(target)) {
          return new Response("blocked", { status: 400 });
        }
        const range = request.headers.get("range");
        const res = await fetch(target, {
          headers: {
            "user-agent": MEDIA_UA,
            referer: refererFor(target, "https://www.1024tera.com/"),
            ...(range ? { range } : {}),
          },
        });
        return pipe(res);
      },
    },
  },
});

async function proxyOwnedSegment(
  request: Request,
  id: string,
  target: string | null,
  origin: string,
): Promise<Response> {
  const entry = getMedia(id);
  if (!entry?.publicDirect || !target || !segmentAllowed(id, target)) {
    return new Response("blocked", { status: 400 });
  }
  const got = await fetchPublic(target, {
    range: request.headers.get("range"),
    referer: entry.referer,
  });
  if (!got) return new Response("blocked", { status: 400 });
  const ctype = got.res.headers.get("content-type") || "";
  if (/text\/html|javascript|\/json/i.test(ctype)) {
    try {
      await got.res.body?.cancel();
    } catch {
      /* ignore */
    }
    return new Response("blocked", { status: 415 });
  }
  const path = (() => {
    try {
      return new URL(target).pathname;
    } catch {
      return "";
    }
  })();
  if (/\.m3u8?$/i.test(path) || /mpegurl/i.test(ctype)) {
    const text = await got.res.text();
    if (text.includes("#EXTM3U")) {
      return new Response(rewritePlaylist(text, got.url, id, origin), {
        headers: {
          "content-type": "application/vnd.apple.mpegurl",
          "cache-control": "no-store",
          "access-control-allow-origin": "*",
        },
      });
    }
    return new Response(text, {
      status: got.res.status,
      headers: { "content-type": ctype || "application/octet-stream", "access-control-allow-origin": "*" },
    });
  }
  return pipe(got.res);
}

function pipe(res: Response): Response {
  const headers = new Headers();
  for (const k of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const v = res.headers.get(k);
    if (v) headers.set(k, v);
  }
  headers.set("cache-control", "private, max-age=120");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-expose-headers", "content-length, content-range, accept-ranges");
  return new Response(res.body, { status: res.status, headers });
}
