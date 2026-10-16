import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

async function dumpDiskwala(page) {
  const reqs = [];
  const resps = [];
  page.on('request', (r) => {
    reqs.push({ url: r.url(), method: r.method(), headers: r.headers() });
  });
  page.on('response', async (r) => {
    const info = { url: r.url(), status: r.status(), method: r.request().method() };
    try {
      const ct = r.headers()['content-type'] || '';
      if (ct.includes('json') || r.url().includes('ddudapidd')) {
        info.body = (await r.text()).slice(0, 4000);
      }
    } catch (e) {
      info.err = String(e);
    }
    resps.push(info);
  });
  await page.goto('https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  const title = await page.title();
  const text = await page.locator('body').innerText();
  console.log('=== DISKWALA PAGE ===');
  console.log('title:', title);
  console.log('body:', text.slice(0, 1800));
  console.log('n reqs', reqs.length, 'n resps', resps.length);
  console.log('--- interesting reqs ---');
  for (const r of reqs) {
    if (/dduda|api\/v1|temp_info|file\/sign|appicrypt|get_files/i.test(r.url)) {
      const h = {};
      for (const [k, v] of Object.entries(r.headers)) {
        if (/appi|content-type|origin/i.test(k)) h[k] = v;
      }
      console.log(r.method, r.url.slice(0, 220), h);
    }
  }
  console.log('--- interesting resps ---');
  for (const r of resps) {
    if (/dduda|api\/v1|temp_info|file\/sign|get_files/i.test(r.url)) {
      console.log(r.status, r.method, r.url.slice(0, 180), (r.body || '').slice(0, 800));
    }
  }
  const evaled = await page.evaluate(() => ({
    hasSubtle: !!(window.crypto && window.crypto.subtle),
    keys: Object.keys(window).filter((k) => /appi|crypt|axios|disk/i.test(k)),
  }));
  console.log('eval', evaled);
}

async function dumpTerabox(page) {
  const resps = [];
  page.on('response', async (r) => {
    const info = { url: r.url(), status: r.status(), method: r.request().method() };
    try {
      const ct = r.headers()['content-type'] || '';
      if (
        ct.includes('json') ||
        ct.includes('mpegurl') ||
        /share\/|api\/|download|stream|m3u8|pcs/i.test(r.url())
      ) {
        const t = await r.text();
        info.body = t.slice(0, 2500);
      }
    } catch (e) {
      info.err = String(e);
    }
    resps.push(info);
  });
  await page.goto('https://www.1024tera.com/sharing/link?surl=6-BFJ6KJhZEBpv_vhNsD6w', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(7000);
  const title = await page.title();
  const text = await page.locator('body').innerText();
  console.log('\n=== TERABOX PAGE ===');
  console.log('title:', title);
  console.log('body:', text.slice(0, 2000));
  console.log('n resps', resps.length);
  console.log('--- api resps ---');
  for (const r of resps) {
    if (/share|list|download|stream|sign|shorturl|api\/|pcs|m3u8|play|template/i.test(r.url)) {
      console.log(r.status, r.method, r.url.slice(0, 240));
      if (r.body) console.log(' BODY', r.body.slice(0, 900));
    }
  }
  const data = await page.evaluate(() => ({
    jsToken: window.jsToken || null,
    templateData: window.templateData || null,
    yunData: window.yunData || null,
    keys: Object.keys(window).filter((k) => /sign|share|yun|token|tera|box|locals/i.test(k)),
  }));
  console.log('window', JSON.stringify(data).slice(0, 2500));

  // try clicking play/download
  const buttons = await page.locator('button, a, [role=button]').allTextContents();
  console.log('buttons', buttons.slice(0, 40));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } });
const p1 = await context.newPage();
try {
  await dumpDiskwala(p1);
} catch (e) {
  console.log('DISKWALA ERR', e);
}
const p2 = await context.newPage();
try {
  await dumpTerabox(p2);
} catch (e) {
  console.log('TERABOX ERR', e);
}
await browser.close();
