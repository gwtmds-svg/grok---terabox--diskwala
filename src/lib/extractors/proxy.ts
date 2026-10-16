import { isAllowedCdn, MEDIA_UA } from "./cdn";
import { isPublicHttpUrl } from "./public-url";

const PASS_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges"] as const;

export async function fetchPublic(
  url: string,
  opts: { range?: string | null; referer?: string; method?: string; timeoutMs?: number } = {},
): Promise<{ res: Response; url: string } | null> {
  let current = url;
  const method = opts.method === "HEAD" ? "HEAD" : "GET";
  for (let hop = 0; hop < 4; hop++) {
    if (!(await isPublicHttpUrl(current))) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
    let res: Response;
    try {
      res = await fetch(current, {
        method,
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "user-agent": MEDIA_UA,
          accept: "*/*",
          ...(opts.referer ? { referer: opts.referer } : {}),
          ...(opts.range ? { range: opts.range } : {}),
        },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      try {
        await res.body?.cancel();
      } catch {
        /* ignore */
      }
      if (!loc) return { res, url: current };
      try {
        current = new URL(loc, current).href;
      } catch {
        return null;
      }
      continue;
    }
    return { res, url: current };
  }
  return null;
}

function mediaResponse(
  res: Response,
  opts: { request: Request; filename?: string; asDownload?: boolean },
): Response {
  const headers = new Headers();
  for (const k of PASS_HEADERS) {
    const v = res.headers.get(k);
    if (v) headers.set(k, v);
  }
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  if (!headers.has("content-type")) {
    const name = (opts.filename || "").toLowerCase();
    headers.set(
      "content-type",
      name.endsWith(".mp4")
        ? "video/mp4"
        : name.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : "application/octet-stream",
    );
  }
  const safe = (opts.filename || "file").replace(/[^\w.\- ()[\]]+/g, "_") || "file";
  headers.set(
    "content-disposition",
    opts.asDownload ? `attachment; filename="${safe}"` : `inline; filename="${safe}"`,
  );
  headers.set("cache-control", "private, max-age=60");
  headers.set("access-control-allow-origin", "*");
  headers.set(
    "access-control-expose-headers",
    "content-length, content-range, accept-ranges, content-disposition",
  );
  headers.set("access-control-allow-headers", "range");
  if (opts.request.method === "HEAD") {
    try {
      void res.body?.cancel();
    } catch {
      /* ignore */
    }
    return new Response(null, { status: res.status, headers });
  }
  return new Response(res.body, { status: res.status, headers });
}

export async function proxyMedia(opts: {
  url: string;
  request: Request;
  filename?: string;
  referer: string;
  asDownload?: boolean;
  publicDirect?: boolean;
}): Promise<Response> {
  if (opts.publicDirect) {
    const got = await fetchPublic(opts.url, {
      range: opts.request.headers.get("range"),
      referer: safeReferer(opts.referer),
      method: opts.request.method,
    });
    if (!got) return Response.json({ error: "blocked host" }, { status: 400 });
    const ctype = got.res.headers.get("content-type") || "";
    if (/text\/html|javascript|\/json/i.test(ctype)) {
      try {
        await got.res.body?.cancel();
      } catch {
        /* ignore */
      }
      return Response.json({ error: "That link is not a video file." }, { status: 415 });
    }
    return mediaResponse(got.res, opts);
  }

  if (!isAllowedCdn(opts.url)) {
    return Response.json({ error: "blocked host" }, { status: 400 });
  }

  const range = opts.request.headers.get("range");
  const method = opts.request.method === "HEAD" ? "HEAD" : "GET";
  let origin = opts.referer;
  try {
    origin = new URL(opts.referer).origin;
  } catch {
    /* keep */
  }
  const res = await fetch(opts.url, {
    method,
    headers: {
      "user-agent": MEDIA_UA,
      accept: "*/*",
      referer: opts.referer,
      origin,
      ...(range ? { range } : {}),
    },
    redirect: "follow",
  });
  return mediaResponse(res, opts);
}

function safeReferer(referer: string): string | undefined {
  try {
    const url = new URL(referer);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    /* ignore */
  }
  return undefined;
}

export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-allow-headers": "range",
      "access-control-max-age": "86400",
    },
  });
}
