export type UsageReport = {
  kind: "share" | "pack" | "any";
  host: string;
  outcome: "ok" | "fail";
  fileCount: number;
  elapsedMs: number;
  device: "mobile" | "desktop";
};

export type UsageSummary = {
  total: number;
  ok: number;
  today: number;
  mobile: number;
  files: number;
  hosts: { host: string; n: number }[];
  stored: boolean;
  backend: "neon" | "pglite";
};

export function usageHost(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return "unknown";
  }
}

export function deviceKind(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

/** Fire after the result is already on screen so it never delays the first paste. */
export function reportUsage(input: UsageReport): Promise<void> {
  return fetch("/api/usage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined);
}
