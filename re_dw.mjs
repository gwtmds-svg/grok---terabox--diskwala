import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const hits = [];
page.on('request', (r) => {
  if (/ddudapidd/.test(r.url())) {
    hits.push({ kind: 'req', method: r.method(), url: r.url(), postData: r.postData() });
  }
});
page.on('response', async (r) => {
  if (/ddudapidd/.test(r.url())) {
    let body = '';
    try { body = await r.text(); } catch (e) { body = 'ERR ' + e; }
    hits.push({
      kind: 'resp',
      status: r.status(),
      url: r.url(),
      ct: r.headers()['content-type'],
      body: body.slice(0, 12000),
    });
  }
});

await page.goto('https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1', {
  waitUntil: 'domcontentloaded',
  timeout: 45000,
});
await page.waitForTimeout(8000);
console.log(JSON.stringify(hits, null, 2));
const text = await page.locator('body').innerText();
console.log('PAGE TEXT:', text.slice(0, 800));
await browser.close();
