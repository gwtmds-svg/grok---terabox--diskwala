import { chromium } from "playwright";
const id = process.argv[2] || "6ac06dfb2a52418b2478d6c4";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"] });
const page = await (await browser.newContext({
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  viewport: { width: 390, height: 844 },
})).newPage();
const hits = [];
await page.route("**/*ddudapidd.diskwala.com/**", async (route) => {
  const req = route.request();
  const res = await route.fetch();
  const body = await res.text();
  hits.push({
    method: req.method(),
    url: req.url(),
    headers: Object.fromEntries(Object.entries(req.headers()).filter(([k]) => /appi|crypt|auth|content|origin|referer|cookie/i.test(k))),
    post: (req.postData() || "").slice(0, 400),
    status: res.status(),
    body: body.slice(0, 6000),
  });
  await route.fulfill({ status: res.status(), headers: res.headers(), body });
});
await page.goto(`https://www.diskwala.com/app/${id}`, { waitUntil: "domcontentloaded", timeout: 25000 });
await page.waitForTimeout(10000);
console.log(JSON.stringify({ title: await page.title(), hits }, null, 2).slice(0, 16000));
await browser.close();
