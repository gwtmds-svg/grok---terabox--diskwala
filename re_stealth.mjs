import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
  ],
});
const context = await browser.newContext({
  userAgent: UA,
  viewport: { width: 1366, height: 768 },
  locale: 'en-US',
});
const page = await context.newPage();
const client = await context.newCDPSession(page);
await client.send('Network.setUserAgentOverride', {
  userAgent: UA,
  acceptLanguage: 'en-US,en',
  platform: 'Win32',
  userAgentMetadata: {
    brands: [
      { brand: 'Chromium', version: '128' },
      { brand: 'Google Chrome', version: '128' },
      { brand: 'Not=A?Brand', version: '10' },
    ],
    fullVersionList: [
      { brand: 'Chromium', version: '128.0.6613.84' },
      { brand: 'Google Chrome', version: '128.0.6613.84' },
      { brand: 'Not=A?Brand', version: '10.0.0.0' },
    ],
    fullVersion: '128.0.6613.84',
    platform: 'Windows',
    platformVersion: '15.0.0',
    architecture: 'x86',
    model: '',
    mobile: false,
    bitness: '64',
    wow64: false,
  },
});
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});

await page.route('**/*', async (route) => {
  const url = route.request().url();
  if (url.includes('ddudapidd')) {
    const response = await route.fetch();
    const body = await response.text();
    console.log('STATUS', response.status(), route.request().method(), url);
    console.log('SEC-CH-UA', route.request().headers()['sec-ch-ua']);
    console.log('BODY', body.slice(0, 6000));
    console.log('-----');
    await route.fulfill({ response, body });
  } else {
    await route.continue();
  }
});

await page.goto('https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1', {
  waitUntil: 'domcontentloaded',
  timeout: 45000,
});
await page.waitForTimeout(10000);
console.log('title', await page.title());
await browser.close();
