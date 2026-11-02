import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../playwright.config';

async function signIn(page: Page, password = E2E_ADMIN.password) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

const tile = (page: Page, name: string) => page.getByRole('region', { name });

test('signs in, manages an entry through its lifecycle, settles it and signs out', async ({ page }) => {
  await signIn(page, 'senha-errada');
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');

  await page.getByLabel('Senha', { exact: true }).fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/lancamentos/);
  await expect(page.getByText('Ainda não há lançamentos neste mês.')).toBeVisible();

  // Create a split, still pending expense in the current month.
  await page.getByRole('button', { name: 'Novo lançamento' }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Valor (R$)').fill('180,00');
  await sheet.getByLabel('Descrição').fill('Conserto do chuveiro');
  await sheet.getByRole('button', { name: 'Moradia' }).click();
  await sheet.getByRole('checkbox', { name: 'Conta dividida' }).check();
  await sheet.getByRole('button', { name: 'Adicionar lançamento' }).click();

  await expect(page.getByText('Lançamento adicionado')).toBeVisible();
  await expect(page.getByText('Conserto do chuveiro')).toBeVisible();
  await expect(tile(page, 'Despesas')).toContainText('Previsto no mês: R$ 180,00');
  await expect(tile(page, 'Acerto a receber')).toContainText('R$ 90,00');

  // Confirm it inline.
  await page.getByRole('button', { name: 'Previsto, clique para alternar' }).click();
  await expect(page.getByRole('button', { name: 'Confirmado, clique para alternar' })).toBeVisible();
  await expect(tile(page, 'Saldo realizado')).toContainText('−R$ 180,00');

  // Edit the value.
  await page.getByRole('button', { name: 'Editar Conserto do chuveiro' }).click();
  await page.getByRole('dialog').getByLabel('Valor (R$)').fill('200');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Lançamento atualizado')).toBeVisible();
  await expect(page.getByText('− R$ 200,00')).toBeVisible();

  // It also shows in "Todos", grouped under its month.
  await page.getByRole('radio', { name: 'Todos' }).first().click();
  await expect(page.getByRole('heading', { name: 'Todos os lançamentos' })).toBeVisible();
  await expect(page.getByText('Mostrando 1–1 de 1')).toBeVisible();
  await page.getByRole('button', { name: /na visão por mês$/ }).click();

  // Register the partner's half as a pending acerto, then remove it again.
  await page.getByRole('button', { name: 'Gerar acerto' }).click();
  const settlement = page.getByRole('dialog', { name: 'Acerto de contas' });
  await expect(settlement.getByText('Conserto do chuveiro', { exact: true })).toBeVisible();
  await settlement.getByRole('button', { name: /^Registrar acerto de R\$\s100,00$/ }).click();
  await expect(page.getByText('Acerto registrado como previsto. Confirme quando receber.')).toBeVisible();
  await expect(page.getByText('Acerto das contas divididas')).toBeVisible();
  await page.getByRole('button', { name: 'Excluir Acerto das contas divididas' }).click();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Excluir Acerto das contas divididas' })).toBeHidden();

  // Delete with confirmation.
  await page.getByRole('button', { name: 'Excluir Conserto do chuveiro' }).click();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByText('Lançamento excluído').last()).toBeVisible();
  await expect(page.getByText('Ainda não há lançamentos neste mês.')).toBeVisible();

  // Sign out.
  await page.getByRole('button', { name: `Conta de ${E2E_ADMIN.name}` }).click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await expect(page.getByRole('status')).toHaveText('Você saiu da sua conta.');
  await page.goto('/lancamentos');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});
