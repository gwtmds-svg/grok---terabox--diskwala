import { chromium } from "playwright";

const MAGIC =
  "eyJwIjoiZXlKa0lqb2lZVU5MU1VnNFVteHZkMDloVkc1NFRtNWxUWGRTVTNZMlpqRm9YMmhQWVdOSVlXVjFZa1V5TlVZM0xXcHZUakpVWjI1V0xVVkpRazkzVW1oUWNrWTFMVnBHTUVkVWRWQldVV2hXVTNCS1ZVeEtiMFp6V0dOcFEzbFRRVXAzTVVJNE9XeHFlWGMzU0ZOVmIyVTFUSEJhTVVwNVR6RlJVaTF1VlZsUmFpMTFhMjh5TTNvM2J6ZzJTbGR0TUdWUk9FTm5SVGxqUlVSVFYxWnFkRzlIYUc5MGJrVlJaWGxmZDFGWWNESjJhbFY0UmtSU01YSkJlRVpuTkVaTWMxUjBTbFpEWjNsWFUwUkVWblZEVGtaUVpETmpWVGRqYldVNFZFcEVOR1JMVWtSM05UaE5hVjltYjJoMUxXVlhRekkwT0VaSE9YaGhSR2x2VUdGTFNFeHhjbEp5YkhGSGNFUnFlbXh6WW5oTk5IQndZVmN6ZFc1S1NrdzJUMGR0VEhFeFRsZGlWa0p5U25FMllVaFRRV3hYWVZsTVJWa3djM2xMTWpKQloyYzRUMGRNZEdKWlNDMWxWa05KU2xkNGJrZEJZMGQxVldaMWNtVmpUbTB5WkU0dE1FcFJXR2RZZVhseFYxSjRTblUyTFhKTWJUaElRWFZ4YTJKalV6Z3laMFJQZGtkRlUwRk9YemRQYVdsWmRUQlFiMDVEYzFwdk5uaHVhVVYwTkhsSFRVODFXa1JLU0hWQ1lXMUZVa0pTTTNWU1VuaEZSMDlQVUVnNGFWQkVjME5rV1dOMFMzSXRkRGRyY0d0T1ZsUlZkak5NVkMxUlIwMXNVM1pXZUZWeE9GZHVRMGhPTUhGcFMwTnNTVTVJWjJWM1dqQlZVM2d6U1cxSk0wMWZaMnB0VUhOa01YTXlXbUkxYlVGaFIzRk9kekkwVFhaU1NFaFVSSGd5Y0VKUlUzcGFORGt6UVhBdE1IRjNSM0pTTFZoTlNUZHFXbFI0TUd4cVlVbHdVRzFyYzNkRVJGSjJORmRLTmtVMk9URmpObkEyZVVvNGEwMURhRTVQVFV4QmFERjZMVmN5TFVOTldVaFlhWEpYVm1GdWFsVlFhWFZCVDBFMGJFdERTSEU1TkdGd1dqZHpRbmwxV0hrM1ZYVnpRaTA1WjJSR2RpMDBTVlJVU0hSR01EWXRPR1ZEUlhKNFkyY3habk0xZGtaeVFXRjZlVU5NUzBVdFpXNVRkekZFWjB4c1RtTmxha1V0VDJSbGRXTTJWRGxPT1dZemVrSXpTREkzVVd4bmJrSjVZV1pITFROT1lXUlFSRmh5TkhoRWNVSlVVWEZrVFhSdFMxcHVOVlZUVWt0cmFITTVYMHA2V2prelVrTmFZekJxU0RSeFkwMXJXbkZDUVd3aUxDSndJam9pVFVacmQwVjNXVWhMYjFwSmVtb3dRMEZSV1VsTGIxcEplbW93UkVGUlkwUlJaMEZGZUc1bmR5MDJZMDFtYjFKdVoyMVBjbms1Y2tKYU5VSmxWM1ZCTmsxT05tcHJNa2hWZUZsNGNWOWhOSFZzUzIxblkyVmxPVFYyVkRSblgwZDNWMnhNYlZWWlRGQjZiWGRyWlhWdVJteGthblp1WDFoaVdsRTlQU0o5IiwicyI6IllYUGl5djlSVmczQlhhTmJLTkVxNTUzeTlSdW01WkQxTEhtdDhnVWhLc19ueWNpWHhxSlBVY040V2hjdnZnLWlldV9JQ01QU3BrVjlYME5CY2otSXl3PT0ifQ==";

const ID = process.argv[2] || "6ac3220468b5fcba7d2af6fd";

function Yt(e) {
  if (e === null || e === undefined) return "";
  if (typeof e !== "object") return JSON.stringify(e);
  if (Array.isArray(e)) return `[${e.map(Yt).join(",")}]`;
  return `{${Object.keys(e).sort().map((t) => `${JSON.stringify(t)}:${Yt(e[t])}`).join(",")}}`;
}

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-blink-features=AutomationControlled"],
});
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  extraHTTPHeaders: { "accept-language": "en-US,en;q=0.9" },
});
const page = await context.newPage();
await page.goto("https://www.diskwala.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(2000);

await page.evaluate(async (MAGIC) => {
  const mod = await import("/pkg/appicrypt-web-f-0_1_216.js");
  await mod.setMagicFile(MAGIC);
  window.__dwSdk = mod;
}, MAGIC);

async function call(path, data, urlPath = path) {
  const ts = Date.now().toString();
  const canonical = `POST ${urlPath} | params= | body=${Yt(data)} | ts=${ts}`;
  const crypt = await page.evaluate(async ({ canonical }) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    return window.__dwSdk.getCryptogram(digest);
  }, { canonical });
  const res = await context.request.post(`https://ddudapidd.diskwala.com/api/v1${path}`, {
    headers: {
      "content-type": "application/json",
      Appicrypt: crypt,
      "Appicrypt-ts": ts,
      origin: "https://www.diskwala.com",
      referer: "https://www.diskwala.com/",
    },
    data,
  });
  const text = await res.text();
  return { status: res.status(), text: text.slice(0, 1500) };
}

for (const urlPath of ["/file/temp_info", "/api/v1/file/temp_info"]) {
  const r = await call("/file/temp_info", { id: ID }, urlPath);
  console.log("path", urlPath, r.status, r.text.slice(0, 350));
}
const r2 = await call("/file/temp_info", { id: ID, web: 1 });
console.log("web1", r2.status, r2.text.slice(0, 350));

await browser.close();
