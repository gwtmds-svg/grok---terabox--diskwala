import { chromium } from "playwright";
import fs from "node:fs";

const outDir = "/tmp/re/hits";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function capture(name, url, extra) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const hits = [];
  page.on("request", (req) => {
    const u = req.url();
    if (/ddudapidd|temp_info|file\/sign|share\/list|share\/streaming|sharedownload|\/api\/download|pcs\/file/i.test(u)) {
      hits.push({
        kind: "req",
        method: req.method(),
        url: u,
        headers: req.headers(),
        post: req.postData() ?? null,
      });
    }
  });
  page.on("response", async (res) => {
    const u = res.url();
    if (/ddudapidd|temp_info|file\/sign|share\/list|share\/streaming|sharedownload|\/api\/download|pcs\/file/i.test(u)) {
      let body = "";
      try {
        body = await res.text();
      } catch (e) {
        body = `<err ${e.message}>`;
      }
      hits.push({
        kind: "res",
        status: res.status(),
        url: u,
        headers: res.headers(),
        body: body.slice(0, 8000),
      });
    }
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (e) {
    console.log(name, "goto", e.message);
  }
  await page.waitForTimeout(10000);
  if (extra) await extra(page);
  await page.waitForTimeout(4000);
  fs.writeFileSync(`${outDir}/${name}.json`, JSON.stringify(hits, null, 2));
  console.log(name, "hits", hits.length, "title", await page.title());
  for (const h of hits) {
    console.log(h.kind, h.status ?? h.method, h.url.slice(0, 180), "post", (h.post || "").slice(0, 200), "body", (h.body || "").slice(0, 180));
  }
  await context.close();
}

await capture("dw", "https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1");
await capture("tb", "https://www.1024tera.com/sharing/link?surl=6-BFJ6KJhZEBpv_vhNsD6w");
await browser.close();
