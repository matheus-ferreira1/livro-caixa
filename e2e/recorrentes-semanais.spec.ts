import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// Months far from today and from the other specs, so this spec never shares data with them.
const SOURCE_MONTH = '2027-05';

// June 2027 Mondays: 7, 14, 21, 28; Fridays: 4, 11, 18, 25.
const JUNE_OCCURRENCES = 8;

test('generates the next month’s occurrences of a weekly recurring entry', async ({ page }) => {
  await signIn(page);
  await page.goto(`/lancamentos?mes=${SOURCE_MONTH}`);

  await page.getByRole('button', { name: 'Novo lançamento' }).first().click();
  const sheet = page.getByRole('dialog');
  // 2027-05-03 is a Monday, so Semanal pre-selects Monday.
  await sheet.getByLabel('Data').fill(`${SOURCE_MONTH}-03`);
  await sheet.getByLabel('Valor (R$)').fill('50,00');
  await sheet.getByLabel('Descrição').fill('Feira semanal');
  await sheet.getByRole('checkbox', { name: 'Recorrente' }).check();
  await sheet.getByRole('radio', { name: 'Semanal' }).check();
  const weekdays = sheet.getByRole('group', { name: 'Dias da semana' });
  await expect(weekdays.getByRole('button', { name: 'segunda-feira' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await weekdays.getByRole('button', { name: 'sexta-feira' }).click();
  await expect(weekdays.getByRole('button', { name: 'sexta-feira' })).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: 'Adicionar lançamento' }).click();
  await expect(page.getByText('Lançamento adicionado')).toBeVisible();

  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page.getByRole('heading', { name: 'Junho 2027' })).toBeVisible();
  await expect(
    page.getByText(`${JUNE_OCCURRENCES} lançamentos recorrentes ainda não foram gerados para Junho 2027.`),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Revisar e gerar' }).click();

  const review = page.getByRole('dialog', { name: 'Gerar lançamentos recorrentes' });
  await expect(review.getByText(`${JUNE_OCCURRENCES} ocorrências`)).toBeVisible();
  await expect(review.getByRole('button', { name: 'Ver datas' })).toHaveAttribute('aria-expanded', 'false');
  await review.getByRole('button', { name: 'Ver datas' }).click();
  await expect(review.getByRole('button', { name: 'Ocultar datas' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(review.getByRole('checkbox', { name: /^(seg|sex) \d\d\/06$/ })).toHaveCount(JUNE_OCCURRENCES);

  await review.getByRole('checkbox', { name: 'seg 07/06' }).uncheck();
  const generated = JUNE_OCCURRENCES - 1;
  await review.getByRole('button', { name: `Gerar ${generated} lançamentos` }).click();

  await expect(page.getByText(`${generated} lançamentos gerados como previstos`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previsto, clique para alternar' })).toHaveCount(generated);
  await expect(page.getByText(/ainda não foram? gerados?/)).toBeHidden();
});
