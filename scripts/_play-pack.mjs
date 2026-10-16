import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(45000);
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 30000 });
const heading = await page.getByRole("heading", { name: /Diskwala Pack/i }).count();
console.log("pack heading", heading);
await page.getByRole("button", { name: /Try the Diskwala sample/i }).click();
const state = await Promise.race([
  page.getByText(/Collected \d+ clip/i).waitFor({ timeout: 40000 }).then(() => "ok"),
  page.getByText(/Could not collect|Pack only opens/i).waitFor({ timeout: 40000 }).then(() => "err"),
]).catch(() => "timeout");
const body = (await page.locator("body").innerText()).slice(0, 2500);
console.log("STATE", state);
console.log(body.slice(0, 1800));
await page.screenshot({ path: "/workspace/screenshots/diskwala-pack.png", fullPage: true });
if (state !== "ok") {
  await browser.close();
  process.exit(1);
}
const cards = await page.locator("article").count();
console.log("cards", cards);
const zip = await page.getByRole("link", { name: /Download all as zip/i }).count();
console.log("zip link", zip);
await page.getByRole("button", { name: /^Play$/ }).first().click();
await page.locator("video").waitFor();
try {
  await page.waitForFunction(() => {
    const v = document.querySelector("video");
    return Boolean(v && Number.isFinite(v.duration) && v.duration > 0 && v.videoWidth > 0);
  }, { timeout: 20000 });
} catch {
  console.log("meta timeout");
}
const info = await page.evaluate(() => {
  const v = document.querySelector("video");
  if (!v) return { none: true };
  return { rs: v.readyState, dur: v.duration, w: v.videoWidth, h: v.videoHeight, src: v.currentSrc };
});
console.log("VIDEO", info);
await page.screenshot({ path: "/workspace/screenshots/diskwala-pack-play.png" });
await browser.close();
process.exit(info.w > 0 && info.dur > 0 ? 0 : 2);
