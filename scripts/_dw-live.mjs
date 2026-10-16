import { chromium } from "playwright";
const id = process.argv[2] || "6ac06dfb2a52418b2478d6c4";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"] });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  viewport: { width: 390, height: 844 },
});
const page = await ctx.newPage();
const hits = [];
page.on("request", (req) => {
  const u = req.url();
  if (/\.(js|css|png|jpg|svg|woff2?|ico)(\?|$)/i.test(u)) return;
  if (/google|gstatic|facebook|cloudflareinsights|doubleclick/i.test(u)) return;
  hits.push({ t: "req", m: req.method(), u: u.slice(0, 240), p: (req.postData() || "").slice(0, 200) });
});
page.on("response", async (res) => {
  const u = res.url();
  if (/\.(js|css|png|jpg|svg|woff2?|ico)(\?|$)/i.test(u)) return;
  if (/google|gstatic|facebook|cloudflareinsights|doubleclick/i.test(u)) return;
  let body = "";
  const ct = res.headers()["content-type"] || "";
  if (/json|text|mpegurl|mp4/i.test(ct) || /temp_info|playlist|cdn|api|sign|stream|mp4/i.test(u)) {
    try { body = (await res.text()).slice(0, 350); } catch {}
  }
  hits.push({ t: "res", s: res.status(), u: u.slice(0, 240), ct, body });
});
await page.goto(`https://www.diskwala.com/app/${id}`, { waitUntil: "domcontentloaded", timeout: 25000 });
await page.waitForTimeout(8000);
console.log(JSON.stringify({ title: await page.title(), text: (await page.locator("body").innerText()).slice(0, 400), hits: hits.slice(0, 50) }, null, 2).slice(0, 14000));
await browser.close();
