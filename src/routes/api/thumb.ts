import { createFileRoute } from "@tanstack/react-router";
import { MEDIA_UA, isAllowedCdn } from "@/lib/extractors/cdn";
import { refererFor } from "@/lib/extractors/media-cache";

export const Route = createFileRoute("/api/thumb")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("u");
        if (!target || !isAllowedCdn(target)) {
          return new Response("blocked", { status: 400 });
        }
        const res = await fetch(target, {
          headers: {
            "user-agent": MEDIA_UA,
            referer: refererFor(target, "https://www.1024tera.com/"),
          },
        });
        return new Response(res.body, {
          status: res.status,
          headers: {
            "content-type": res.headers.get("content-type") || "image/jpeg",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
