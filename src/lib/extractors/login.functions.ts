import { createServerFn } from "@tanstack/react-start";
import { currentSession, loginTerabox, logoutTerabox } from "./terabox-login";

export const loginTeraboxFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { email?: string; password?: string };
    if (!d || typeof d.email !== "string" || typeof d.password !== "string") {
      throw new Error("email and password are required");
    }
    return { email: d.email, password: d.password };
  })
  .handler(async ({ data }) => loginTerabox(data.email, data.password));

export const sessionStatusFn = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async () => currentSession());

export const logoutTeraboxFn = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async () => {
    logoutTerabox();
    return { ok: true as const };
  });
