import { createServerFn } from "@tanstack/react-start";
import { resolveShare } from "./index";
import { resolvePack } from "./pack";
import { getSessionCookie, mergeCookies } from "./session";

export const resolveLink = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { url?: string; cookie?: string };
    if (!d || typeof d.url !== "string") throw new Error("url is required");
    return { url: d.url, cookie: typeof d.cookie === "string" ? d.cookie : "" };
  })
  .handler(async ({ data }) => {
    const cookie = mergeCookies(getSessionCookie(), data.cookie);
    return resolveShare(data.url, cookie);
  });

export const resolvePackFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { url?: string };
    if (!d || typeof d.url !== "string") throw new Error("url is required");
    return { url: d.url };
  })
  .handler(async ({ data }) => resolvePack(data.url));
