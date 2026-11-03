import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../playwright.config';

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Senha', { exact: true }).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/visao-geral/);
}

// Mid-month, so the next closing is not open yet: from the 25th it would open right after the first.
const MID_MONTH = new Date('2026-06-15T12:00:00');

// No other spec touches the portfolio.
test('adds an asset, registers the first closing and removes the asset', async ({ page }) => {
  await page.clock.setFixedTime(MID_MONTH);
  await signIn(page);
  await page.getByRole('link', { name: 'Patrimônio' }).click();
  await expect(page.getByText('0 ativos em 0 instituições')).toBeVisible();

  await page.getByRole('button', { name: 'Novo ativo' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Novo ativo' });
  await sheet.getByLabel('Banco ou corretora').fill('XP');
  await sheet.getByLabel('Ativo', { exact: true }).fill('Tesouro 27');
  await sheet.getByLabel('Valor aplicado (R$)').fill('1000,00');
  await sheet.getByLabel('Valor atual (R$)').fill('1500,00');
  await sheet.getByRole('button', { name: 'Adicionar ativo' }).click();
  await expect(page.getByText('Ativo adicionado à carteira')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'R$ 1.500,00' })).toBeVisible();

  await page.getByRole('status').getByRole('button', { name: 'Fazer fechamento' }).click();
  const closing = page.getByRole('dialog', { name: /^Fechamento de / });
  await closing.getByLabel('Aporte ou resgate em Tesouro 27').fill('100,00');
  await closing.getByLabel('Valor atual de Tesouro 27').fill('1.650,00');
  await expect(closing.getByText('R$ 1.650,00')).toBeVisible();
  await closing.getByRole('button', { name: /^Registrar fechamento de / }).click();

  await expect(page.getByText(/^Fechamento de .* registrado$/)).toBeVisible();
  await expect(page.getByText(/até lá não há nada para atualizar\.$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fechamento em dia' })).toBeDisabled();
  await expect(page.getByRole('heading', { level: 1, name: 'R$ 1.650,00' })).toBeVisible();

  await page.getByRole('button', { name: 'Remover Tesouro 27' }).click();
  await page.getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(page.getByText('“Tesouro 27” removido da carteira')).toBeVisible();
  await expect(page.getByText('Nenhum ativo na carteira.').first()).toBeVisible();
});
