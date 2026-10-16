import { chromium } from "playwright";

const targets = [
  {
    name: "diskwala",
    url: "https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1",
  },
  {
    name: "terabox",
    url: "https://www.1024tera.com/sharing/link?surl=6-BFJ6KJhZEBpv_vhNsD6w",
  },
];

const browser = await chromium.launch({ headless: true });

for (const t of targets) {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const reqs = [];
  page.on("request", (r) => {
    const u = r.url();
    if (
      u.includes("api") ||
      u.includes("share") ||
      u.includes("download") ||
      u.includes("file") ||
      u.includes("ddudapidd") ||
      u.includes("stream") ||
      u.includes("sign")
    ) {
      reqs.push({
        method: r.method(),
        url: u,
        headers: r.headers(),
        postData: r.postData(),
      });
    }
  });
  const resps = [];
  page.on("response", async (r) => {
    const u = r.url();
    if (
      u.includes("api") ||
      u.includes("share") ||
      u.includes("download") ||
      u.includes("ddudapidd") ||
      u.includes("stream") ||
      u.includes("file/temp") ||
      u.includes("file/sign") ||
      u.includes("shorturl")
    ) {
      let body = "";
      try {
        const ct = r.headers()["content-type"] || "";
        if (ct.includes("json") || ct.includes("text") || ct.includes("mpegurl")) {
          body = (await r.text()).slice(0, 4000);
        } else {
          body = `[${ct} ${r.headers()["content-length"] || "?"}]`;
        }
      } catch (e) {
        body = `err ${e.message}`;
      }
      resps.push({ status: r.status(), url: u, body });
    }
  });
  console.log("\n\n========== VISIT", t.name, t.url);
  try {
    await page.goto(t.url, { waitUntil: "networkidle", timeout: 45000 });
  } catch (e) {
    console.log("goto err", e.message);
  }
  await page.waitForTimeout(5000);
  console.log("TITLE", await page.title());
  console.log("--- REQUESTS", reqs.length);
  for (const r of reqs) {
    console.log(r.method, r.url);
    if (r.postData) console.log("  POST", r.postData.slice(0, 500));
    const interesting = ["appicrypt", "cookie", "authorization", "referer"];
    for (const [k, v] of Object.entries(r.headers)) {
      if (interesting.some((x) => k.includes(x))) console.log("  H", k, String(v).slice(0, 180));
    }
  }
  console.log("--- RESPONSES", resps.length);
  for (const r of resps) {
    console.log(r.status, r.url);
    console.log("  BODY", r.body.slice(0, 1500));
  }
  await context.close();
}
await browser.close();
