import { expect, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../playwright.config';

interface SignInOptions {
  password?: string;
  /** Turn off to submit credentials that are expected to be refused. */
  expectLanding?: boolean;
}

export async function signIn(
  page: Page,
  { password = E2E_ADMIN.password, expectLanding = true }: SignInOptions = {},
) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  if (expectLanding) await expect(page).toHaveURL(/\/visao-geral/);
}
