import { expect, test, type Locator, type Page } from '@playwright/test';
import { signIn } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

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

/** Labels of the areas inside `scope` whose content is cut off sideways instead of fitting. */
async function clippedAreas(scope: Locator): Promise<string[]> {
  return scope.evaluate((root) =>
    Array.from(root.querySelectorAll('*'))
      .filter((element) => {
        const style = getComputedStyle(element);
        const clips = style.overflowX === 'hidden' || style.overflowX === 'clip';
        // An ellipsis is a deliberate cut, and a 1px box is text kept for screen readers only.
        const deliberate = style.textOverflow === 'ellipsis' || element.clientWidth <= 1;
        return clips && !deliberate && element.scrollWidth > element.clientWidth + 1;
      })
      .map((element) => element.outerHTML.slice(0, 120)),
  );
}

/** Everything that does not fit the screen's width inside `scope`. */
async function overflowing(page: Page, scope: Locator): Promise<string[]> {
  return [...(await sidewaysScrollers(page, scope)), ...(await clippedAreas(scope))];
}

const EXPENSE = {
  description: 'Aluguel do apartamento da praia',
  note: 'Vence todo dia 10, com reajuste em janeiro',
  type: 'despesa',
  valueCents: 123_456_78,
  split: true,
  confirmed: false,
};

async function createExpense(page: Page, date: string, recurring: boolean): Promise<string> {
  const { categories } = await (await page.request.get('/api/categories')).json();
  const category = categories.find((candidate: { type: string }) => candidate.type === 'despesa');
  const response = await page.request.post('/api/transactions', {
    data: { ...EXPENSE, date, categoryId: category.id, recurring },
  });
  const { transaction } = await response.json();
  return transaction.id;
}

test('every screen fits a phone without sideways scrolling', async ({ page }) => {
  await signIn(page);

  const expenseId = await createExpense(page, `${MONTH}-10`, true);
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
    expect(await overflowing(page, main)).toEqual([]);

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
    expect(await overflowing(page, main)).toEqual([]);

    await page.goto('/lancamentos?modo=all');
    await expect(page.getByRole('button', { name: 'Editar Aluguel do apartamento da praia' })).toBeVisible();
    expect(await overflowing(page, main)).toEqual([]);

    await page.goto(`/lancamentos?mes=${NEXT_MONTH}`);
    await page.getByRole('button', { name: 'Gerar recorrentes' }).click();
    const recurring = page.getByRole('dialog');
    await expect(recurring.getByText('Aluguel do apartamento da praia')).toBeVisible();
    expect(await overflowing(page, recurring)).toEqual([]);

    await page.goto('/resumo?ano=2031&modo=proj');
    await expect(page.getByRole('row', { name: /^Maio/ })).toContainText('Em aberto');
    expect(await overflowing(page, main)).toEqual([]);

    await page.goto('/patrimonio');
    await expect(page.getByRole('button', { name: 'Editar Reserva de emergência' })).toBeVisible();
    expect(await overflowing(page, main)).toEqual([]);

    await page.getByRole('button', { name: 'Fazer fechamento' }).first().click();
    const closing = page.getByRole('dialog');
    await expect(closing.getByText('Reserva de emergência')).toBeVisible();
    expect(await overflowing(page, closing)).toEqual([]);

    await page.goto('/configuracoes');
    await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
    expect(await overflowing(page, main)).toEqual([]);
  } finally {
    await page.request.delete(`/api/assets/${asset.id}`);
    await page.request.delete(`/api/transactions/${expenseId}`);
  }
});

test('a chart tooltip stays on the screen for every month', async ({ page }) => {
  await signIn(page);
  await page.goto(`/visao-geral?mes=${MONTH}`);
  const bars = page
    .getByRole('region', { name: /Receitas e despesas/ })
    .locator('[role="img"][tabindex="0"]');
  await expect(bars).toHaveCount(12);

  for (let month = 0; month < 12; month += 1) {
    await bars.nth(month).focus();
    await expect(bars.nth(month).getByText('Sem lançamentos')).toBeInViewport({ ratio: 1 });
  }
});

// The bar shows up to 767px, which is wider than the width where the toast library treats a screen as a phone.
test('a toast stays above the bottom nav bar on a wide phone', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  await signIn(page);
  await createExpense(page, `${MONTH}-20`, false);
  await page.goto(`/lancamentos?mes=${MONTH}`);

  await page.getByRole('button', { name: `Excluir ${EXPENSE.description}` }).click();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  const toast = page.getByText('Lançamento excluído');
  await expect(toast).toBeVisible();

  // The toast slides up into place, so its position is read until it settles above the bar.
  const navBox = await page.getByRole('navigation', { name: 'Principal' }).boundingBox();
  const navTop = navBox?.y ?? 0;
  await expect
    .poll(async () => {
      const toastBox = await toast.boundingBox();
      return toastBox ? toastBox.y + toastBox.height : Infinity;
    })
    .toBeLessThanOrEqual(navTop);
});

// The options box clips its content, so it once shrank to fit the sheet instead of letting it scroll.
test('the entry form scrolls to its last option on a short screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 600 });
  await signIn(page);
  await page.goto(`/lancamentos?mes=${MONTH}`);
  await page.getByRole('button', { name: 'Novo lançamento' }).first().click();

  const lastOption = page.getByRole('dialog').getByText('Desmarcado, fica como previsto.');
  await lastOption.scrollIntoViewIfNeeded();
  await expect(lastOption).toBeInViewport({ ratio: 1 });
});
