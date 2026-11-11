import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../playwright.config';
import { signIn } from './helpers';

const SETTINGS_PATH = '/configuracoes';

async function chooseLanguageAndCurrency(page: Page, language: string, currency: string) {
  await page.goto(SETTINGS_PATH);
  await page.getByRole('combobox', { name: /^(Idioma|Language)$/ }).selectOption({ label: language });
  await page.getByRole('combobox', { name: /^(Moeda|Currency)$/ }).selectOption({ label: currency });
}

async function saveSettings(request: APIRequestContext, settings: { language?: string; currency?: string }) {
  const login = await request.post('/api/auth/login', {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password, remember: false },
  });
  expect(login.ok()).toBe(true);
  const saved = await request.put('/api/settings', { data: settings });
  expect(saved.ok()).toBe(true);
}

// The language and the currency belong to the whole instance, so a failed run must not leave the
// other specs reading English. Specs run one at a time, in this order.
test.afterEach(async ({ request }) => {
  await saveSettings(request, { language: 'pt-BR', currency: 'BRL' });
});

test('switches to English and dollars, shows amounts that way, and keeps the choice across a reload', async ({
  page,
}) => {
  await signIn(page);
  await chooseLanguageAndCurrency(page, 'English', 'US dollar ($)');

  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link')).toHaveText([
    'Overview',
    'Entries',
    'Net worth',
    'Monthly summary',
    'Settings',
  ]);

  await nav.getByRole('link', { name: 'Entries' }).click();
  await expect(page.getByText('There are no entries this month yet.')).toBeVisible();

  await page.getByRole('button', { name: 'New entry' }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Amount ($)').fill('1,234.56');
  await sheet.getByLabel('Description', { exact: true }).fill('Plumber');
  await sheet.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('Entry added')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Expenses' })).toContainText('Pending this month: $1,234.56');

  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Expenses' })).toContainText('$1,234.56');

  await page.getByRole('button', { name: 'Delete Plumber' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Entry deleted').last()).toBeVisible();

  await chooseLanguageAndCurrency(page, 'Português (Brasil)', 'Real brasileiro (R$)');
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Lançamentos' })
    .click();
  await expect(page.getByText('Ainda não há lançamentos neste mês.')).toBeVisible();
});

test('shows the sign-in page in the instance language before anyone signs in', async ({ page, request }) => {
  await saveSettings(request, { language: 'en' });
  await request.post('/api/auth/logout');

  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Your finances, on your server.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
