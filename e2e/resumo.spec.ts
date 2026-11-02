import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../playwright.config';

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Senha', { exact: true }).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/lancamentos/);
}

// A year far from today, so this spec never shares data with the others.
const YEAR = '2028';
const MONTH = `${YEAR}-03`;

test('summarizes a pending split bill in both modes and opens its month', async ({ page }) => {
  await signIn(page);
  await page.goto(`/lancamentos?mes=${MONTH}`);

  await page.getByRole('button', { name: 'Novo lançamento' }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Data').fill(`${MONTH}-10`);
  await sheet.getByLabel('Valor (R$)').fill('100,00');
  await sheet.getByLabel('Descrição').fill('Conta de luz');
  await sheet.getByRole('checkbox', { name: 'Conta dividida' }).check();
  await sheet.getByRole('button', { name: 'Adicionar lançamento' }).click();
  await expect(page.getByText('Lançamento adicionado')).toBeVisible();

  await page.getByRole('link', { name: 'Resumo mensal' }).click();
  await expect(page).toHaveURL(/\/resumo/);
  await page.goto(`/resumo?ano=${YEAR}`);

  const march = page.getByRole('row', { name: /^Março/ });
  await expect(march).toContainText('Em aberto');
  await expect(march).toContainText('—');
  await expect(march).not.toContainText('R$');

  await page.getByRole('radio', { name: 'Com previstos' }).click();
  await expect(march).toContainText('−R$ 50,00');
  await expect(page.getByRole('img', { name: 'Março: balanço de −R$ 50,00' })).toBeVisible();

  await page.getByRole('link', { name: 'Ver lançamentos de Março' }).click();
  await expect(page).toHaveURL(new RegExp(`/lancamentos\\?mes=${MONTH}`));
  await expect(page.getByRole('heading', { name: 'Março 2028' })).toBeVisible();
});
