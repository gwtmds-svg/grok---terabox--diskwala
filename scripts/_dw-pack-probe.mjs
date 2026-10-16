import { chromium } from "playwright";

const pages = [
  "https://www.diskwala.com/playlist/6ab3fbfd2a52418b24e638cd",
  "https://www.diskwala.com/creator/69e8914249748cec6cfb45d8",
  "https://www.diskwala.com/app/6ab3fbfd2a52418b24e638cd",
];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
});

for (const target of pages) {
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const hits = [];
  page.on("response", async (res) => {
    const u = res.url();
    if (!/ddudapidd|diskwala\.com\/api|playlist|creator|get_files|temp_info/i.test(u)) return;
    if (/static|css|js|png|svg|woff|google|doubleclick|inmobi|prebid/i.test(u)) return;
    let body = "";
    try {
      body = (await res.text()).slice(0, 1500);
    } catch (e) {
      body = String(e);
    }
    hits.push({ status: res.status(), url: u, body });
  });
  console.log("\n########", target);
  try {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(6000);
  } catch (e) {
    console.log("goto err", e.message);
  }
  console.log("title", await page.title());
  console.log("text", (await page.locator("body").innerText()).slice(0, 350).replace(/\n/g, " | "));
  console.log("hits", JSON.stringify(hits, null, 2).slice(0, 4000));
  await page.close();
}
await browser.close();
