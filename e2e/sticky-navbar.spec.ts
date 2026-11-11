import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../playwright.config';
import { signIn } from './helpers';

// A year far from today, so this spec never shares ledger data with the others.
const MONTH = '2032-03';
const ENTRY_COUNT = 40;

async function expectOk(response: APIResponse, action: string) {
  expect(response.ok(), `${action} answered ${response.status()}: ${await response.text()}`).toBe(true);
}

// Each id is recorded as soon as its entry exists, so a failure midway still leaves the list to clean up.
async function createEntries(api: APIRequestContext, ids: string[]) {
  const listed = await api.get('/api/categories');
  await expectOk(listed, 'listing the categories');
  const { categories } = await listed.json();
  const category = categories.find((candidate: { type: string }) => candidate.type === 'despesa');
  for (let index = 0; index < ENTRY_COUNT; index += 1) {
    const response = await api.post('/api/transactions', {
      data: {
        description: `Lançamento ${index}`,
        note: '',
        type: 'despesa',
        valueCents: 10_00,
        split: false,
        confirmed: true,
        recurring: false,
        date: `${MONTH}-10`,
        categoryId: category.id,
      },
    });
    await expectOk(response, `creating entry ${index}`);
    ids.push((await response.json()).transaction.id);
  }
}

// One refused delete must not stop the rest from being removed, so the failures are reported together.
async function deleteEntries(api: APIRequestContext, ids: string[]) {
  const failures: string[] = [];
  for (const id of ids) {
    const response = await api.delete(`/api/transactions/${id}`);
    if (!response.ok()) failures.push(`${id}: ${response.status()} ${await response.text()}`);
  }
  expect(failures, 'entries that could not be deleted').toEqual([]);
}

async function openLongPage(page: Page) {
  await page.goto(`/lancamentos?mes=${MONTH}`);
  await expect(page.getByRole('button', { name: 'Editar Lançamento 0' })).toBeVisible();
  const viewportHeight = page.viewportSize()?.height ?? 0;
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(
    pageHeight,
    'the page must be taller than the screen for this test to mean anything',
  ).toBeGreaterThan(viewportHeight + 200);
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
}

test.describe('the top navigation while scrolling', () => {
  const entryIds: string[] = [];
  let api: APIRequestContext | undefined;

  // The entries are the same for every test, so they are made once, through the API.
  test.beforeAll(async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL });
    api = context;
    const login = await context.post('/api/auth/login', {
      data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password, remember: false },
    });
    await expectOk(login, 'signing in through the API');
    await createEntries(context, entryIds);
  });

  test.afterAll(async () => {
    if (!api) return;
    try {
      await deleteEntries(api, entryIds);
    } finally {
      await api.dispose();
    }
  });

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
  ]) {
    test(`stays at the top of the ${viewport.name} screen`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openLongPage(page);
      await scrollToBottom(page);

      const nav = page.getByRole('navigation', { name: 'Principal' });
      await expect(nav).toBeInViewport({ ratio: 1 });
      await nav.getByRole('link', { name: 'Resumo mensal' }).click();
      await expect(page).toHaveURL(/\/resumo/);
    });
  }

  test('scrolls away on a phone held sideways, where it would take too much of the screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openLongPage(page);
    await scrollToBottom(page);

    await expect(page.getByRole('navigation', { name: 'Principal' })).not.toBeInViewport();
  });

  test('scrolls away with the page on a phone, leaving the bottom bar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLongPage(page);
    await scrollToBottom(page);

    await expect(page.getByText('Livro-caixa', { exact: true })).not.toBeInViewport();
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeInViewport({ ratio: 1 });
  });
});

// The header takes its height from --sticky-header-height, and so does the scroll padding that clears it.
// If the header content outgrows the variable, the header gets taller than the padding and this fails.
for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
]) {
  test(`keeps the ${viewport.name} header as tall as the scroll padding that clears it`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page);

    const header = await page.getByRole('banner').boundingBox();
    const scrollPaddingTop = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
    );

    expect(header?.height).toBe(scrollPaddingTop);
  });
}
