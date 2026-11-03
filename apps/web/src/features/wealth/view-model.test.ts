import { buildWealth, type Asset } from '@livro-caixa/domain';
import { describe, expect, test } from 'vitest';
import { wealthViewModel } from './view-model';

const TODAY = '2026-11-03';
const NOW = Date.UTC(2026, 10, 3, 15, 0);
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

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

const auto = (overrides: Partial<Extract<Asset, { pricing: 'auto' }>> = {}): Asset => ({
  id: crypto.randomUUID(),
  institution: 'Clear',
  name: 'MXRF11',
  assetClass: 'fii',
  pricing: 'auto',
  quantityE8: 100_000_000,
  avgPriceCents: null,
  priceCents: 894,
  dayChangeBps: null,
  quotedAt: null,
  quoteFailed: false,
  updatedAt: '2026-10-28',
  ...overrides,
});

const viewOf = (assets: Asset[], options: { calm?: boolean } = {}) =>
  wealthViewModel(buildWealth({ assets, snapshots: [], today: TODAY }), 'class', options.calm ?? true, NOW);

describe('wealthViewModel', () => {
  test('uses singular labels for one asset in one institution', () => {
    expect(viewOf([manual()]).assetCount).toBe('1 ativo em 1 instituição');
  });

  test('tags a manual asset with its update date', () => {
    const [group] = viewOf([manual()]).groups;
    expect(group?.rows[0]).toMatchObject({
      pricingTag: { kind: 'manual', label: 'Manual · 28/10' },
      priceNote: '',
      quantity: '—',
      price: '—',
    });
  });

  test('tells how long ago an updated quote was current', () => {
    const [group] = viewOf([auto({ quotedAt: NOW - 12 * MINUTE })]).groups;
    expect(group?.rows[0]).toMatchObject({
      pricingTag: { kind: 'updated', label: 'Atualizada há 12 min' },
      priceNote: '',
    });
  });

  test('reads a quote from this very minute as now', () => {
    const [group] = viewOf([auto({ quotedAt: NOW })]).groups;
    expect(group?.rows[0]?.pricingTag.label).toBe('Atualizada agora');
  });

  test('flags an asset never quoted and dates its typed price', () => {
    const [group] = viewOf([auto()]).groups;
    expect(group?.rows[0]).toMatchObject({
      pricingTag: { kind: 'unavailable', label: 'Cotação indisponível' },
      priceNote: 'em 28/10',
    });
  });

  test('flags a failed check and shows the age of the last quote', () => {
    const [group] = viewOf([auto({ quotedAt: NOW - 3 * DAY, quoteFailed: true })]).groups;
    expect(group?.rows[0]).toMatchObject({
      pricingTag: { kind: 'unavailable', label: 'Cotação indisponível' },
      priceNote: 'há 3 dias',
    });
  });

  test('says when any quote is unavailable', () => {
    expect(viewOf([auto()]).hasUnavailableQuote).toBe(true);
    expect(viewOf([auto({ quotedAt: NOW }), manual()]).hasUnavailableQuote).toBe(false);
  });

  test('adds the currency to a câmbio quantity', () => {
    const [group] = viewOf([
      auto({
        institution: 'Wise',
        name: 'Dólar',
        assetClass: 'cambio',
        quantityE8: 489_000_000,
        priceCents: 519,
      }),
    ]).groups;
    expect(group?.rows[0]).toMatchObject({
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
