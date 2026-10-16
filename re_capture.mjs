import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } });

async function capture(page, label, url, match) {
  const hits = [];
  page.on('request', (r) => {
    if (match.test(r.url())) {
      hits.push({
        kind: 'req',
        method: r.method(),
        url: r.url(),
        headers: r.headers(),
        postData: r.postData(),
      });
    }
  });
  page.on('response', async (r) => {
    if (match.test(r.url())) {
      let body = '';
      try { body = await r.text(); } catch {}
      hits.push({
        kind: 'resp',
        status: r.status(),
        url: r.url(),
        headers: r.headers(),
        body: body.slice(0, 8000),
      });
    }
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  console.log('\n====', label, '====');
  for (const h of hits) {
    console.log(JSON.stringify(h, null, 2).slice(0, 5000));
    console.log('-----');
  }
  return hits;
}

const p1 = await context.newPage();
await capture(
  p1,
  'DISKWALA',
  'https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1',
  /ddudapidd|temp_info|file\/sign|get_files|auth/,
);

const p2 = await context.newPage();
await capture(
  p2,
  'TERABOX shorturlinfo+streaming',
  'https://www.1024tera.com/sharing/link?surl=6-BFJ6KJhZEBpv_vhNsD6w',
  /shorturlinfo|share\/list|share\/streaming|share\/download|api\/download/,
);

await browser.close();
