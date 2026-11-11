import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// Months far from today, so this spec never shares data with the others.
const SOURCE_MONTH = '2027-03';
const NEXT_MONTH = '2027-04';

test('generates next month’s occurrence of a recurring entry', async ({ page }) => {
  await signIn(page);
  await page.goto(`/lancamentos?mes=${SOURCE_MONTH}`);

  await page.getByRole('button', { name: 'Novo lançamento' }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Data').fill(`${SOURCE_MONTH}-31`);
  await sheet.getByLabel('Valor (R$)').fill('119,90');
  await sheet.getByLabel('Descrição').fill('Internet fibra');
  await sheet.getByRole('checkbox', { name: 'Recorrente' }).check();
  await sheet.getByRole('button', { name: 'Adicionar lançamento' }).click();
  await expect(page.getByText('Lançamento adicionado')).toBeVisible();

  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page.getByRole('heading', { name: 'Abril 2027' })).toBeVisible();
  await expect(page.getByText('1 lançamento recorrente ainda não foi gerado para Abril 2027.')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar e gerar' }).click();

  const review = page.getByRole('dialog', { name: 'Gerar lançamentos recorrentes' });
  await expect(review.getByLabel('Data de Internet fibra')).toHaveValue(`${NEXT_MONTH}-30`);
  await review.getByLabel('Valor de Internet fibra').fill('129,90');
  await review.getByRole('button', { name: 'Gerar 1 lançamento' }).click();

  await expect(page.getByText('1 lançamento gerado como previstos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previsto, clique para alternar' })).toBeVisible();
  await expect(page.getByText('− R$ 129,90')).toBeVisible();
  await expect(page.getByText(/ainda não foi gerado/)).toBeHidden();
});
