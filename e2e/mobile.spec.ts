import { expect, test, type Locator, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../playwright.config';

test.use({ viewport: { width: 375, height: 812 } });

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Senha', { exact: true }).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/visao-geral/);
}

// A year far from today, so this spec never shares ledger data with the others.
const MONTH = '2031-05';
const NEXT_MONTH = '2031-06';

/** Labels of the areas inside `scope` that scroll sideways, plus the page itself. */
async function sidewaysScrollers(page: Page, scope: Locator): Promise<string[]> {
  const inScope = await scope.evaluate((root) =>
    [root, ...Array.from(root.querySelectorAll('*'))]
      .filter((element) => {
        const overflow = getComputedStyle(element).overflowX;
        return (
          (overflow === 'auto' || overflow === 'scroll') && element.scrollWidth > element.clientWidth + 1
        );
      })
      .map(
        (element) =>
          element.closest('[aria-label], [aria-labelledby]')?.outerHTML.slice(0, 120) ?? 'unlabelled',
      ),
  );
  const pageOverflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  return pageOverflows ? [...inScope, 'page'] : inScope;
}

test('every screen fits a phone without sideways scrolling', async ({ page }) => {
  await signIn(page);

  const { categories } = await (await page.request.get('/api/categories')).json();
  const expenseCategory = categories.find((category: { type: string }) => category.type === 'despesa');
  await page.request.post('/api/transactions', {
    data: {
      date: `${MONTH}-10`,
      description: 'Aluguel do apartamento da praia',
      note: 'Vence todo dia 10, com reajuste em janeiro',
      type: 'despesa',
      categoryId: expenseCategory.id,
      valueCents: 123_456_78,
      split: true,
      confirmed: false,
      recurring: true,
    },
  });
  const created = await page.request.post('/api/assets', {
    data: {
      institution: 'Banco do Brasil',
      name: 'Reserva de emergência',
      assetClass: 'reserva',
      pricing: 'manual',
      quantityE8: null,
      avgPriceCents: null,
      priceCents: null,
      investedCents: 100_000_00,
      currentCents: 123_456_78,
      today: `${MONTH}-10`,
    },
  });
  const { asset } = await created.json();

  try {
    const main = page.getByRole('main');

    await page.goto(`/visao-geral?mes=${MONTH}&modo=proj`);
    await expect(page.getByText('Aluguel do apartamento da praia')).toBeVisible();
    expect(await sidewaysScrollers(page, main)).toEqual([]);

    // The navigation stays on one line.
    const tops = await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link')
      .evaluateAll((links) =>
        links
          .filter((link) => link.getClientRects().length > 0)
          .map((link) => link.getBoundingClientRect().top),
      );
    expect(tops.length).toBeGreaterThanOrEqual(4);
    expect(new Set(tops).size).toBe(1);

    await page.goto(`/lancamentos?mes=${MONTH}`);
    await expect(page.getByRole('button', { name: 'Editar Aluguel do apartamento da praia' })).toBeVisible();
    await expect(page.getByText('− R$ 123.456,78')).toBeVisible();
    expect(await sidewaysScrollers(page, main)).toEqual([]);

    await page.goto('/lancamentos?modo=all');
    await expect(page.getByRole('button', { name: 'Editar Aluguel do apartamento da praia' })).toBeVisible();
    expect(await sidewaysScrollers(page, main)).toEqual([]);

    await page.goto(`/lancamentos?mes=${NEXT_MONTH}`);
    await page.getByRole('button', { name: 'Gerar recorrentes' }).click();
    const recurring = page.getByRole('dialog');
    await expect(recurring.getByText('Aluguel do apartamento da praia')).toBeVisible();
    expect(await sidewaysScrollers(page, recurring)).toEqual([]);

    await page.goto('/resumo?ano=2031&modo=proj');
    await expect(page.getByRole('row', { name: /^Maio/ })).toContainText('Em aberto');
    expect(await sidewaysScrollers(page, main)).toEqual([]);

    await page.goto('/patrimonio');
    await expect(page.getByRole('button', { name: 'Editar Reserva de emergência' })).toBeVisible();
    expect(await sidewaysScrollers(page, main)).toEqual([]);

    await page.getByRole('button', { name: 'Fazer fechamento' }).first().click();
    const closing = page.getByRole('dialog');
    await expect(closing.getByText('Reserva de emergência')).toBeVisible();
    expect(await sidewaysScrollers(page, closing)).toEqual([]);

    await page.goto('/configuracoes');
    await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
    expect(await sidewaysScrollers(page, main)).toEqual([]);
  } finally {
    await page.request.delete(`/api/assets/${asset.id}`);
  }
});
