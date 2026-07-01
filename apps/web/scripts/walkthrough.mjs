// Suite walkthrough: logs in once on Home, then visits every product and
// performs a signature action — proving SSO across apps and that each product
// works end-to-end. Runs headless for validation, or headed (HEADED=1) with a
// slow motion for screen recording.
import { chromium } from '@playwright/test';

const HEADED = process.env.HEADED === '1';
const SLOWMO = Number(process.env.SLOWMO ?? (HEADED ? 550 : 0));
const PAUSE = Number(process.env.PAUSE ?? (HEADED ? 1100 : 250));

const URLS = {
  home: 'http://localhost:3010',
  jira: 'http://localhost:3000', // pragma: allowlist secret
  confluence: 'http://localhost:3001',
  trello: 'http://localhost:3002',
  servicedesk: 'http://localhost:3003',
  discovery: 'http://localhost:3004',
  statuspage: 'http://localhost:3005',
  opsgenie: 'http://localhost:3006',
  compass: 'http://localhost:3007',
  bitbucket: 'http://localhost:3008',
  atlas: 'http://localhost:3009',
};

const results = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✅ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err: String(err).split('\n')[0] });
    console.log(`❌ ${name} — ${String(err).split('\n')[0]}`);
    if (!HEADED) throw err;
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: SLOWMO,
    args: ['--window-position=0,0', '--window-size=1512,950', '--start-maximized'],
  });
  const context = await browser.newContext({ viewport: { width: 1512, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  await step('Sign in on Home (SSO for the whole suite)', async () => {
    await page.goto(`${URLS.home}/login`);
    await page.locator('#email').fill('ada@taskflow.dev');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByText('Good to see you').waitFor();
    await wait(PAUSE);
  });

  await step('Home launcher shows the product grid', async () => {
    await page.getByText('Confluence').first().waitFor();
    await page.getByText('Bitbucket').first().waitFor();
    await wait(PAUSE);
  });

  await step('Jira — kanban board loads', async () => {
    await page.goto(URLS.jira);
    await page.getByText('Implement drag-and-drop').first().waitFor();
    await wait(PAUSE);
  });

  await step('Confluence — open the wiki tree and create a page', async () => {
    await page.goto(URLS.confluence);
    await page.getByText('Engineering Home').first().waitFor();
    await page.getByRole('button', { name: 'Onboarding' }).first().click();
    await page.getByRole('heading', { name: 'Onboarding' }).first().waitFor();
    await wait(PAUSE);
    await page.getByRole('button', { name: '+ New page' }).click();
    await page.locator('#page-title').fill('Release checklist');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('heading', { name: 'Release checklist' }).first().waitFor();
    await wait(PAUSE);
  });

  await step('Trello — board with lists and cards', async () => {
    await page.goto(URLS.trello);
    await page.getByText('Product Roadmap').first().waitFor();
    await page.getByText('Realtime sync').first().waitFor();
    await wait(PAUSE);
  });

  await step('Service Management — portal then agent queue', async () => {
    await page.goto(URLS.servicedesk);
    await page.getByText('What can we help you with?').waitFor();
    await wait(PAUSE);
    await page.getByRole('button', { name: 'Agent queue' }).click();
    await page.getByText('Laptop will not boot').first().waitFor();
    await wait(PAUSE);
  });

  await step('Product Discovery — upvote an idea and open the matrix', async () => {
    await page.goto(URLS.discovery);
    await page.getByText('Mobile app').first().waitFor();
    await page.getByRole('button', { name: 'Upvote' }).first().click();
    await wait(PAUSE);
    await page.getByRole('button', { name: 'Impact / Effort' }).click();
    await wait(PAUSE);
  });

  await step('Statuspage — components and incident timeline', async () => {
    await page.goto(URLS.statuspage);
    await page.getByText('Elevated API latency').first().waitFor();
    await wait(PAUSE);
  });

  await step('Opsgenie — acknowledge an alert', async () => {
    await page.goto(URLS.opsgenie);
    await page.getByText('High error rate on checkout service').first().waitFor();
    await page.getByRole('button', { name: 'Ack' }).first().click();
    await wait(PAUSE);
  });

  await step('Compass — component catalog + health', async () => {
    await page.goto(URLS.compass);
    await page.getByText('checkout-service').first().waitFor();
    await wait(PAUSE);
  });

  await step('Bitbucket — open a pull request and merge it', async () => {
    await page.goto(URLS.bitbucket);
    await page.getByText('Add dark mode toggle').first().waitFor();
    await page.getByText('Add dark mode toggle').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await wait(PAUSE);
    await dialog.getByRole('button', { name: 'Merge' }).click();
    await dialog.getByText('Merged').first().waitFor();
    await wait(PAUSE);
  });

  await step('Atlas — post a project status update', async () => {
    await page.goto(URLS.atlas);
    await page.getByText('Q3 Onboarding revamp').first().waitFor();
    await page.getByText('Q3 Onboarding revamp').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await wait(PAUSE);
    await dialog.locator('textarea').fill('Back on track — extra engineer onboarded and designs approved.');
    await dialog.getByRole('button', { name: 'Post update' }).click();
    await dialog.getByText('Back on track', { exact: false }).first().waitFor();
    await wait(PAUSE);
  });

  await step('Back to Home', async () => {
    await page.goto(URLS.home);
    await page.getByText('Good to see you').waitFor();
    await wait(PAUSE);
  });

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
  if (failed.length > 0) {
    console.log('FAILED:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
  console.log('ALL STEPS PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
