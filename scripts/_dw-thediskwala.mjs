import { chromium } from "playwright";
const URL = process.argv[2] || "https://www.diskwala.com/app/695bed15daec01eb6714503f";
const sites = [
  `https://thediskwala.com/?url=${encodeURIComponent(URL)}`,
  `https://thediskwala.com/`,
  `https://disk-wala.vercel.app/`,
];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox","--disable-dev-shm-usage"] });
const page = await browser.newPage({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 800 },
});
const hits = [];
page.on("request", (req) => {
  const u = req.url();
  if (/api|extract|diskwala|cdn|stream|proxy|video|mp4|m3u8|supabase|worker/i.test(u) && !/google|gstatic|facebook|analytics/i.test(u)) {
    hits.push({ t: "req", m: req.method(), u: u.slice(0, 220), p: (req.postData() || "").slice(0, 180) });
  }
});
page.on("response", async (res) => {
  const u = res.url();
  if (/api|extract|diskwala|cdn|stream|proxy|video|mp4|m3u8|worker/i.test(u) && !/google|gstatic|facebook|analytics/i.test(u)) {
    let body = "";
    try { body = (await res.text()).slice(0, 400); } catch {}
    hits.push({ t: "res", s: res.status(), u: u.slice(0, 220), body });
  }
});
try {
  await page.goto("https://thediskwala.com/", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(1500);
  const input = await page.$("input, textarea");
  if (input) {
    await input.fill(URL);
    const btn = await page.$("button");
    if (btn) await btn.click();
    await page.waitForTimeout(8000);
  } else {
    await page.waitForTimeout(3000);
  }
} catch (e) {
  console.log("goto err", e.message);
}
console.log(JSON.stringify({ title: await page.title().catch(()=>""), hits: hits.slice(0, 40) }, null, 2).slice(0, 12000));
await browser.close();
