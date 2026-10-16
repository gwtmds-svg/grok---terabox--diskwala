import { chromium } from "playwright";

const urls = [
  "https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1",
  "https://www.1024tera.com/sharing/link?surl=6-BFJ6KJhZEBpv_vhNsD6w",
];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const url of urls) {
  console.log("\n========== NAV", url, "==========");
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const hits = [];
  page.on("request", (req) => {
    const u = req.url();
    if (
      /api|file|share|download|stream|sign|temp|playlist|video|cdn|pcs|appicrypt/i.test(u) &&
      !/google|facebook|analytics|sentry|cloudflareinsights|iconify|fonts|gtag|doubleclick/.test(u)
    ) {
      hits.push({
        type: "req",
        method: req.method(),
        url: u.slice(0, 400),
        headers: {
          Appicrypt: req.headers()["appicrypt"],
          "Appicrypt-ts": req.headers()["appicrypt-ts"],
        },
        post: req.postData()?.slice(0, 500) ?? null,
      });
    }
  });
  page.on("response", async (res) => {
    const u = res.url();
    if (/ddudapidd|file\/temp|file\/sign|file\/playlist|file\/creator|share\/list|sharedownload|\/api\/download|pcs\/file/i.test(u)) {
      let body = "";
      try {
        body = (await res.text()).slice(0, 2000);
      } catch {}
      hits.push({ type: "res", status: res.status(), url: u.slice(0, 400), body });
    }
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (e) {
    console.log("goto err", e.message);
  }
  await page.waitForTimeout(12000);
  console.log("TITLE", await page.title());
  console.log("HITS", hits.length);
  for (const h of hits) {
    console.log(JSON.stringify(h).slice(0, 1200));
  }
  await context.close();
}
await browser.close();
