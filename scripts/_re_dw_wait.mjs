import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();

page.on("response", async (res) => {
  const u = res.url();
  if (u.includes("ddudapidd") || u.includes("temp_info") || u.includes("/auth")) {
    let body = "";
    try { body = await res.text(); } catch (e) { body = String(e); }
    console.log("RES", res.status(), u, body.slice(0, 2500));
  }
});

const wait = page.waitForResponse(
  (r) => r.url().includes("temp_info") || r.url().includes("/file/"),
  { timeout: 25000 },
).catch((e) => console.log("wait err", e.message));

await page.goto("https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1", {
  waitUntil: "domcontentloaded",
  timeout: 45000,
});
await wait;
await page.waitForTimeout(5000);
console.log("title", await page.title());
console.log("body text", (await page.locator("body").innerText()).slice(0, 1500));
await browser.close();
