import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end coverage for TaskFlow:
 *  1. Happy path: signup → workspace → project → task → move → reload persists.
 *  2. Realtime: a task created in one tab appears live in a second tab.
 */

async function signupAndCreateProject(
  page: Page,
  options: { workspaceName: string; projectName: string; projectKey: string },
): Promise<void> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

  await page.goto('/signup');
  await page.locator('#name').fill('E2E Tester');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Create a workspace')).toBeVisible();
  await page.locator('#ws-name').fill(options.workspaceName);
  await page.getByRole('button', { name: 'Create workspace' }).click();

  await page.getByRole('button', { name: 'Create project' }).click();
  await page.locator('#project-name').fill(options.projectName);
  await page.locator('#project-key').fill(options.projectKey);
  await page.getByRole('button', { name: 'Create project' }).last().click();

  await expect(page).toHaveURL(/\/w\/.+\/p\/.+/);
  await expect(page.getByRole('heading', { name: options.projectName })).toBeVisible();
}

async function createTask(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'New task' }).click();
  await page.locator('#task-title').fill(title);
  await page.getByRole('button', { name: 'Create task' }).click();
}

async function dragCardToColumn(page: Page, cardText: string, status: string): Promise<void> {
  const card = page.locator('[data-testid="task-card"]', { hasText: cardText });
  const column = page.locator(`[data-status="${status}"]`);
  await expect(card).toBeVisible();
  await expect(column).toBeVisible();

  const cardBox = await card.boundingBox();
  const colBox = await column.boundingBox();
  if (!cardBox || !colBox) throw new Error('Could not resolve drag geometry');

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = colBox.x + colBox.width / 2;
  const endY = colBox.y + colBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 12, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.mouse.move(endX, endY + 8, { steps: 5 });
  await page.mouse.up();
}

test('signup, create project, create + move a task, and persist after reload', async ({ page }) => {
  await signupAndCreateProject(page, {
    workspaceName: 'E2E Workspace',
    projectName: 'E2E Project',
    projectKey: 'E2E',
  });

  await createTask(page, 'E2E Task');
  const backlog = page.locator('[data-status="BACKLOG"]');
  await expect(backlog.getByText('E2E Task')).toBeVisible();

  await dragCardToColumn(page, 'E2E Task', 'IN_PROGRESS');
  const inProgress = page.locator('[data-status="IN_PROGRESS"]');
  await expect(inProgress.getByText('E2E Task')).toBeVisible();
  await expect(backlog.getByText('E2E Task')).toHaveCount(0);

  await page.reload();
  await expect(
    page.locator('[data-status="IN_PROGRESS"]').getByText('E2E Task'),
  ).toBeVisible();
});

test('realtime: a task created in one tab appears in a second tab', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await signupAndCreateProject(page, {
    workspaceName: 'RT Workspace',
    projectName: 'RT Project',
    projectKey: 'RT',
  });

  // Second tab on the same board (shares the session cookie via the context).
  const boardUrl = page.url();
  const page2 = await context.newPage();
  await page2.goto(boardUrl);
  await expect(page2.getByRole('heading', { name: 'RT Project' })).toBeVisible();

  // Create a task in the first tab; it should appear live in the second.
  await createTask(page, 'Realtime Task');
  await expect(
    page2.locator('[data-testid="task-card"]', { hasText: 'Realtime Task' }),
  ).toBeVisible({ timeout: 15_000 });

  await context.close();
});
