import { createFileRoute } from "@tanstack/react-router";
import { resolveShare } from "@/lib/extractors";
import { getSessionCookie, mergeCookies } from "@/lib/extractors/session";

export const Route = createFileRoute("/api/resolve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { url?: string; cookie?: string };
        const url = typeof body.url === "string" ? body.url : "";
        if (!url) return Response.json({ ok: false, error: "url required" }, { status: 400 });
        try {
          const result = await resolveShare(url, mergeCookies(getSessionCookie(), body.cookie));
          return Response.json(result);
        } catch (err) {
          return Response.json(
            {
              ok: false,
              host: "unknown",
              inputUrl: url,
              error: err instanceof Error ? err.message : "Resolve failed",
              elapsedMs: 0,
            },
            { status: 200 },
          );
        }
      },
    },
  },
});
