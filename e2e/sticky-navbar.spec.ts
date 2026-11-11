import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../playwright.config';

// A year far from today, so this spec never shares ledger data with the others.
const MONTH = '2032-03';
const ENTRY_COUNT = 40;

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Senha', { exact: true }).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/visao-geral/);
}

async function createEntries(page: Page): Promise<string[]> {
  const { categories } = await (await page.request.get('/api/categories')).json();
  const category = categories.find((candidate: { type: string }) => candidate.type === 'despesa');
  const ids: string[] = [];
  for (let index = 0; index < ENTRY_COUNT; index += 1) {
    const response = await page.request.post('/api/transactions', {
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
    ids.push((await response.json()).transaction.id);
  }
  return ids;
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
  let entryIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    entryIds = await createEntries(page);
  });

  test.afterEach(async ({ page }) => {
    for (const id of entryIds) await page.request.delete(`/api/transactions/${id}`);
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
