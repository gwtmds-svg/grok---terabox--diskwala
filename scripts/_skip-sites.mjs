import { chromium } from "playwright";
const URL = "https://www.diskwala.com/app/6ac3220468b5fcba7d2af6fd";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
});
const hits = [];
function attach(page, tag) {
  page.on("response", async (res) => {
    const u = res.url();
    if (/api|extract|proxy|diskwala|stream|cdn/i.test(u) && !/static|chunk|css|woff|png|svg|turnstile|cloudflare.com\/cdn-cgi/i.test(u)) {
      let body = "";
      try { body = (await res.text()).slice(0, 400); } catch {}
      hits.push({ tag, status: res.status(), u: u.slice(0, 180), body });
    }
  });
}

async function trySite(name, home, fill) {
  const page = await context.newPage();
  attach(page, name);
  console.log("OPEN", name);
  try {
    await page.goto(home, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1500);
    await fill(page);
    await page.waitForTimeout(8000);
    console.log("title", await page.title());
  } catch (e) {
    console.log(name, "err", e.message);
  }
  await page.close();
}

await trySite("thediskwala", "https://thediskwala.com/", async (page) => {
  const input = page.locator("input").first();
  if (await input.count()) {
    await input.fill(URL);
    const btn = page.getByRole("button").filter({ hasText: /play|download|search|go|fetch|open/i }).first();
    if (await btn.count()) await btn.click({ timeout: 3000 }).catch(() => {});
    else await page.keyboard.press("Enter");
  }
});

await trySite("playdiskwala", "https://playdiskwala.in/", async (page) => {
  const input = page.locator("input").first();
  if (await input.count()) {
    await input.fill(URL);
    const btn = page.getByRole("button").first();
    if (await btn.count()) await btn.click({ timeout: 3000 }).catch(() => {});
    else await page.keyboard.press("Enter");
  }
});

await trySite("teraboxdl", "https://www.teraboxdl.site/", async (page) => {
  const tab = page.getByText(/diskwala/i).first();
  if (await tab.count()) await tab.click().catch(() => {});
  const input = page.locator("input").first();
  if (await input.count()) {
    await input.fill(URL);
    const btn = page.getByRole("button").first();
    if (await btn.count()) await btn.click({ timeout: 3000 }).catch(() => {});
  }
});

console.log("HITS", JSON.stringify(hits, null, 2));
await browser.close();
