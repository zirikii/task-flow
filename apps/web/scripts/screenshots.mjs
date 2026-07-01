import { chromium } from '@playwright/test';

const OUT = '/opt/cursor/artifacts';
const U = {
  home: 'http://localhost:3010',
  confluence: 'http://localhost:3001',
  trello: 'http://localhost:3002',
  discovery: 'http://localhost:3004',
  statuspage: 'http://localhost:3005',
  bitbucket: 'http://localhost:3008',
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);

await page.goto(`${U.home}/login`);
await page.locator('#email').fill('ada@taskflow.dev');
await page.locator('#password').fill('password123');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByText('Good to see you').waitFor();
await wait(800);
await page.screenshot({ path: `${OUT}/suite-01-home.png` });

// Open the app switcher for a nice shot (best-effort).
try {
  await page.getByRole('button', { name: 'Switch product' }).click();
  await page.getByText('Your apps').waitFor({ timeout: 5000 });
  await wait(400);
  await page.screenshot({ path: `${OUT}/suite-02-appswitcher.png` });
  await page.keyboard.press('Escape');
} catch {
  console.log('app switcher shot skipped');
}

await page.goto(U.confluence);
await page.getByText('Engineering Home').first().waitFor();
await wait(700);
await page.screenshot({ path: `${OUT}/suite-03-confluence.png` });

await page.goto(U.trello);
await page.getByText('Product Roadmap').first().waitFor();
await wait(700);
await page.screenshot({ path: `${OUT}/suite-04-trello.png` });

await page.goto(U.discovery);
await page.getByText('Mobile app').first().waitFor();
await page.getByRole('button', { name: 'Impact / Effort' }).click();
await wait(700);
await page.screenshot({ path: `${OUT}/suite-05-discovery-matrix.png` });

await page.goto(U.statuspage);
await page.getByText('Elevated API latency').first().waitFor();
await wait(700);
await page.screenshot({ path: `${OUT}/suite-06-statuspage.png` });

await page.goto(U.bitbucket);
await page.getByText('Add dark mode toggle').first().waitFor();
await wait(700);
await page.screenshot({ path: `${OUT}/suite-07-bitbucket.png` });

await browser.close();
console.log('screenshots saved');
