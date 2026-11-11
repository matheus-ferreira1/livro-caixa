import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// A month far from today, so this spec never shares data with the others.
const MONTH = '2029-05';

test('lands on the dashboard after sign-in and confirms what is open', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');

  await page.goto(`/lancamentos?mes=${MONTH}`);
  await page.getByRole('button', { name: 'Novo lançamento' }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Data').fill(`${MONTH}-10`);
  await sheet.getByLabel('Valor (R$)').fill('100,00');
  await sheet.getByLabel('Descrição').fill('Internet');
  await sheet.getByRole('checkbox', { name: 'Conta dividida' }).check();
  await sheet.getByRole('button', { name: 'Adicionar lançamento' }).click();
  await expect(page.getByText('Lançamento adicionado')).toBeVisible();

  await page.goto(`/visao-geral?mes=${MONTH}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Maio 2029' })).toBeVisible();
  const balance = page.getByRole('region', { name: 'Balanço do mês' });
  await expect(balance).toContainText('Sem lançamentos no mês');
  await expect(page.getByRole('region', { name: /^Acerto com/ })).toContainText('Pendente');

  // "Com previstos" counts the bill and the partner's half of it.
  await page.getByRole('radio', { name: 'Com previstos' }).click();
  await expect(balance).toContainText('−R$ 50,00');

  await page.getByRole('button', { name: 'Confirmar Internet' }).click();
  await expect(page.getByText('“Internet” confirmado')).toBeVisible();
  await expect(page.getByText('Nada pendente em Maio 2029.')).toBeVisible();
});
