import { chromium } from "playwright";

const ID = "6ab3fbfd2a52418b24e638cd";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
});
const page = await browser.newPage({ userAgent: UA, viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined });
});

const hits = [];
await page.route("**/*ddudapidd.diskwala.com/**", async (route) => {
  const req = route.request();
  const response = await route.fetch();
  const body = await response.text();
  hits.push({
    method: req.method(),
    url: req.url(),
    post: (req.postData() || "").slice(0, 300),
    status: response.status(),
    body: body.slice(0, 8000),
  });
  await route.fulfill({
    status: response.status(),
    headers: response.headers(),
    body,
  });
});

await page.goto(`https://www.diskwala.com/app/${ID}`, { waitUntil: "domcontentloaded", timeout: 25000 });
await page.waitForTimeout(7000);
console.log("=== /app hits ===");
console.log(JSON.stringify(hits, null, 2).slice(0, 12000));

// Try calling sibling endpoints from the page after WASM is live
const extra = await page.evaluate(async (id) => {
  const out = {};
  for (const path of ["playlist_info", "creator_info", "temp_info"]) {
    try {
      const res = await fetch(`https://ddudapidd.diskwala.com/api/v1/file/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      out[path] = { status: res.status, body: (await res.text()).slice(0, 4000) };
    } catch (e) {
      out[path] = { error: String(e) };
    }
  }
  return out;
}, ID);
console.log("=== in-page extra ===");
console.log(JSON.stringify(extra, null, 2).slice(0, 8000));
console.log("=== later hits ===", hits.length);
console.log(JSON.stringify(hits.slice(-6), null, 2).slice(0, 8000));
await browser.close();
