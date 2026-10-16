import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
});
const page = await context.newPage();

await page.route('**/*', async (route) => {
  const url = route.request().url();
  if (url.includes('ddudapidd')) {
    const response = await route.fetch();
    const body = await response.text();
    console.log('INTERCEPT', route.request().method(), url, response.status());
    console.log('REQ BODY', route.request().postData());
    console.log('RESP', body.slice(0, 8000));
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
console.log('DONE title', await page.title());
await browser.close();
