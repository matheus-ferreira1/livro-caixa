import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { E2E_ADMIN } from '../../../playwright.config';

const OUTPUT_DIR = resolve(import.meta.dirname, '../public/screenshots');
// The demo seed runs from Nov 2025 to Oct 2026. On the 26th, October has open items and its closing is due.
const DEMO_TODAY = new Date('2026-10-26T12:00:00-03:00');
const DESKTOP = { width: 1440, height: 900 };
const OPEN_GRAPH = { width: 1200, height: 630 };
const PHONE = { width: 375, height: 812 };
const WEBP_QUALITY = 0.82;
const OG_JPEG_QUALITY = 85;

/** Re-encodes a PNG as WebP in the browser, so the capture needs no image library. */
async function toWebp(page: Page, png: Buffer): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    async ({ source, quality }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      return canvas.toDataURL('image/webp', quality);
    },
    { source: `data:image/png;base64,${png.toString('base64')}`, quality: WEBP_QUALITY },
  );
  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64');
}

/**
 * Signs in through the API, since the sign-in page speaks the instance's language and a second
 * capture in the same run would find it in English. Then sets the instance to English with
 * dollars, which is how the site shows the app.
 */
async function signInInEnglishWithDollars(page: Page) {
  const login = await page.request.post('/api/auth/login', {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password, remember: false },
  });
  expect(login.ok()).toBe(true);
  const settings = await page.request.put('/api/settings', { data: { language: 'en', currency: 'USD' } });
  expect(settings.ok()).toBe(true);
}

async function settle(page: Page, heading: string | RegExp) {
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
}

async function snapshot(page: Page, options: Parameters<Page['screenshot']>[0] = {}) {
  // The pointer would otherwise rest where the last click was and open a chart tooltip.
  await page.mouse.move(0, 0);
  return page.screenshot({ ...options, animations: 'disabled', caret: 'hide' });
}

async function save(page: Page, name: string) {
  const png = await snapshot(page);
  writeFileSync(resolve(OUTPUT_DIR, `${name}.webp`), await toWebp(page, png));
}

test.beforeAll(() => mkdirSync(OUTPUT_DIR, { recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(DEMO_TODAY);
});

test('desktop screens at 1440px', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await signInInEnglishWithDollars(page);
  await page.goto('/visao-geral');

  await settle(page, 'October 2026');
  await save(page, 'visao-geral');
  // Link previews crop to 1.91:1, so the app is laid out at that size rather than cropped.
  await page.setViewportSize(OPEN_GRAPH);
  await settle(page, 'October 2026');
  await snapshot(page, {
    path: resolve(OUTPUT_DIR, '../og-image.jpg'),
    type: 'jpeg',
    quality: OG_JPEG_QUALITY,
  });
  await page.setViewportSize(DESKTOP);

  await page.goto('/lancamentos');
  await settle(page, 'October 2026');
  await save(page, 'lancamentos');

  await page.getByRole('button', { name: 'Generate settlement' }).click();
  await expect(page.getByRole('dialog', { name: 'Bill settlement' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await save(page, 'acerto');
  await page.keyboard.press('Escape');

  await page.goto('/resumo');
  await settle(page, '2026');
  await save(page, 'resumo');

  await page.goto('/patrimonio');
  await expect(page.getByRole('heading', { name: 'Month by month' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await save(page, 'patrimonio');
});

test.describe('phone', () => {
  // A phone shot is shown at its CSS size, so it needs the pixel density of a phone to stay sharp.
  test.use({ viewport: PHONE, deviceScaleFactor: 2 });

  test('phone screens at 375px', async ({ page }) => {
    await signInInEnglishWithDollars(page);
    await page.goto('/visao-geral');
    await settle(page, 'October 2026');
    await save(page, 'visao-geral-phone');
    await page.goto('/lancamentos');
    await settle(page, 'October 2026');
    await save(page, 'lancamentos-phone');
  });
});
