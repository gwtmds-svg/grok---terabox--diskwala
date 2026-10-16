import { createFileRoute } from "@tanstack/react-router";
import { parseUsage, recordUsage, usageSummary } from "@/lib/usage";

export const Route = createFileRoute("/api/usage")({
  server: {
    handlers: {
      GET: async () => Response.json(await usageSummary()),
      POST: async ({ request }) => {
        const row = parseUsage(await request.json().catch(() => null));
        if (!row) return new Response(null, { status: 400 });
        await Promise.race([
          recordUsage(row).catch(() => undefined),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
        return new Response(null, { status: 204 });
      },
    },
  },
});
