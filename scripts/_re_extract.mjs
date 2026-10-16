import { chromium } from "playwright";

async function teraboxHttp(surl) {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const pageUrl = `https://www.1024tera.com/sharing/link?surl=${surl}`;
  const pageRes = await fetch(pageUrl, { headers: { "user-agent": ua }, redirect: "follow" });
  const html = await pageRes.text();
  const cookies = [];
  const raw = pageRes.headers.getSetCookie?.() || [];
  for (const c of raw) cookies.push(c.split(";")[0]);
  const cookieHeader = cookies.join("; ");
  const jsToken = decodeURIComponent(html).match(/fn\("([A-F0-9]+)"\)/)?.[1]
    || html.match(/fn%28%22([A-F0-9]+)%22/)?.[1]
    || "";
  const listUrl = new URL("https://www.1024tera.com/share/list");
  listUrl.searchParams.set("app_id", "250528");
  listUrl.searchParams.set("shorturl", surl);
  listUrl.searchParams.set("root", "1");
  listUrl.searchParams.set("scene", "");
  listUrl.searchParams.set("web", "1");
  listUrl.searchParams.set("page", "1");
  listUrl.searchParams.set("num", "100");
  listUrl.searchParams.set("channel", "dubox");
  listUrl.searchParams.set("clienttype", "0");
  if (jsToken) listUrl.searchParams.set("jsToken", jsToken);
  const listRes = await fetch(listUrl, {
    headers: { "user-agent": ua, cookie: cookieHeader, referer: pageUrl },
  });
  const json = await listRes.json();
  return { cookieHeader, jsToken, json };
}

async function teraboxStream(surl) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  })).newPage();
  let streamUrl = null;
  let m3u8 = null;
  page.on("response", async (res) => {
    const u = res.url();
    if (u.includes("/share/streaming") && u.includes("M3U8_FLV")) {
      streamUrl = u;
      try { m3u8 = (await res.text()).slice(0, 400); } catch {}
    }
  });
  await page.goto(`https://www.1024tera.com/sharing/link?surl=${surl}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(8000);
  await browser.close();
  return { streamUrl, m3u8 };
}

async function diskwala(id) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await (await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  })).newPage();
  const hits = [];
  page.on("response", async (res) => {
    const u = res.url();
    if (u.includes("temp_info") || u.includes("playlist_info") || u.includes("file/sign")) {
      let body = "";
      try { body = await res.text(); } catch (e) { body = String(e); }
      hits.push({ status: res.status(), url: u, body: body.slice(0, 4000) });
    }
  });
  await page.goto(`https://www.diskwala.com/app/${id}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(10000);
  const title = await page.title();
  const text = (await page.locator("body").innerText()).slice(0, 500);
  await browser.close();
  return { title, text, hits };
}

const surl = "6-BFJ6KJhZEBpv_vhNsD6w";
console.log("=== TB HTTP ===");
const http = await teraboxHttp(surl);
console.log("jsToken", http.jsToken.slice(0, 20), "errno", http.json.errno, "files", http.json.list?.length, "share_id", http.json.share_id);
console.log("file", http.json.list?.[0]?.server_filename, http.json.list?.[0]?.size);

console.log("=== TB STREAM ===");
const st = await teraboxStream(surl);
console.log("streamUrl", st.streamUrl);
console.log("m3u8", st.m3u8);

console.log("=== DW ===");
const dw = await diskwala("6a8d41a406ba7ea03d30ccb1");
console.log(JSON.stringify(dw, null, 2).slice(0, 3000));
