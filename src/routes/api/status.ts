import { createFileRoute } from "@tanstack/react-router";
import { kickRefresh, statusPayload } from "@/lib/extractors/engine";

export const Route = createFileRoute("/api/status")({
  server: {
    handlers: {
      GET: async () => {
        kickRefresh();
        return Response.json(statusPayload());
      },
    },
  },
});
