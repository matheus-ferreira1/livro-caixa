import { buildWealth, type Asset } from '@livro-caixa/domain';
import { describe, expect, test } from 'vitest';
import { wealthViewModel } from './view-model';

const TODAY = '2026-11-03';

const manual = (overrides: Partial<Extract<Asset, { pricing: 'manual' }>> = {}): Asset => ({
  id: crypto.randomUUID(),
  institution: 'XP',
  name: 'Tesouro',
  assetClass: 'tesouro',
  pricing: 'manual',
  investedCents: 1000,
  currentCents: 1500,
  updatedAt: '2026-10-28',
  ...overrides,
});

const viewOf = (assets: Asset[], options: { calm?: boolean } = {}) =>
  wealthViewModel(buildWealth({ assets, snapshots: [], today: TODAY }), 'class', options.calm ?? true);

describe('wealthViewModel', () => {
  test('uses singular labels for one asset in one institution', () => {
    expect(viewOf([manual()]).assetCount).toBe('1 ativo em 1 instituição');
  });

  test('tags a manual asset with its update date', () => {
    const [group] = viewOf([manual()]).groups;
    expect(group?.rows[0]).toMatchObject({ pricingLabel: 'Manual · 28/10', quantity: '—', price: '—' });
  });

  test('tags an automatic asset and adds the currency to a câmbio quantity', () => {
    const [group] = viewOf([
      {
        id: 'usd',
        institution: 'Wise',
        name: 'Dólar',
        assetClass: 'cambio',
        pricing: 'auto',
        quantityE8: 489_000_000,
        avgPriceCents: null,
        priceCents: 519,
        dayChangeBps: null,
        updatedAt: TODAY,
      },
    ]).groups;
    expect(group?.rows[0]).toMatchObject({
      pricingLabel: 'Cotação automática',
      quantity: '4,89 USD',
      avgPrice: '—',
      invested: '—',
      result: '—',
      day: '—',
    });
  });

  test('marks a tiny share instead of rounding it to zero', () => {
    const { groups } = viewOf([
      manual({ currentCents: 1, assetClass: 'conta' }),
      manual({ currentCents: 10_000_000 }),
    ]);
    expect(groups.find((g) => g.name === 'Conta e poupança')?.percent).toBe('<0,1%');
  });

  test('shows a loss in the expense tone with the minus of the design', () => {
    const [group] = viewOf([manual({ investedCents: 2000, currentCents: 1500 })]).groups;
    expect(group?.rows[0]).toMatchObject({ resultTone: 'bad', resultPercent: '−25%' });
    expect(group?.rows[0]?.result).toMatch(/^− R\$/);
  });

  test('shows no percentage when the cost is zero', () => {
    const [group] = viewOf([manual({ investedCents: 0, currentCents: 1500 })]).groups;
    expect(group?.rows[0]?.resultPercent).toBe('');
  });

  test('keeps singular and plural counts on group headers', () => {
    const { groups } = viewOf([manual(), manual()]);
    expect(groups[0]?.count).toBe('2 ativos');
  });
});
