import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

const DARK_PAGE = 'rgb(27, 36, 31)';
const LIGHT_PAGE = 'rgb(244, 245, 241)';

const pageBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** The class the init script set before the app ran, read before any module code. */
async function themeBeforeTheAppRuns(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive')
        (window as unknown as { darkAtParse: boolean }).darkAtParse =
          document.documentElement.classList.contains('dark');
    });
  });
  await page.reload();
  return page.evaluate(() => (window as unknown as { darkAtParse: boolean }).darkAtParse);
}

test('follows a dark system from the first paint, on the sign-in page too', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  expect(await pageBackground(page)).toBe(DARK_PAGE);
  expect(await themeBeforeTheAppRuns(page)).toBe(true);
});

test('keeps Claro across a reload while the system is dark, and goes back to the system', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await signIn(page);
  await page.goto('/configuracoes');
  const theme = page.getByRole('combobox', { name: 'Tema' });

  await theme.selectOption({ label: 'Claro' });
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  expect(await themeBeforeTheAppRuns(page)).toBe(false);
  expect(await pageBackground(page)).toBe(LIGHT_PAGE);

  await page.getByRole('combobox', { name: 'Tema' }).selectOption({ label: 'Sistema' });
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
});
