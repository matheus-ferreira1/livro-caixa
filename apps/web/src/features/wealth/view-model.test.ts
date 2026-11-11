import {
  buildWealth,
  DEFAULT_LOCALIZATION,
  localization,
  type Asset,
  type Localization,
  type Snapshot,
} from '@livro-caixa/domain';
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

const viewOf = (
  assets: Asset[],
  options: { calm?: boolean; l10n?: Localization } = {},
  snapshots: Snapshot[] = [],
) =>
  wealthViewModel(
    buildWealth({ assets, snapshots, today: TODAY }),
    'class',
    options.calm ?? true,
    NOW,
    options.l10n ?? DEFAULT_LOCALIZATION,
  );

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

describe('wealthViewModel in English with US dollars', () => {
  const english = localization('en', 'USD');
  const viewInEnglish = (assets: Asset[]) => viewOf(assets, { l10n: english });

  test('words the counts, tags and notes in English', () => {
    expect(viewInEnglish([manual(), auto()]).assetCount).toBe('2 assets in 2 institutions');
    const [group] = viewInEnglish([auto({ quotedAt: NOW - 12 * MINUTE })]).groups;
    expect(group?.rows[0]?.pricingTag.label).toBe('Updated 12 min ago');
    const [stale] = viewInEnglish([auto()]).groups;
    expect(stale?.rows[0]).toMatchObject({
      pricingTag: { label: 'Quote unavailable' },
      priceNote: 'on 28/10',
    });
  });

  test('names the asset class in English', () => {
    expect(viewInEnglish([manual()]).groups[0]?.name).toBe('Treasury bonds');
  });

  test('shows amounts and percentages with the dollar number format', () => {
    const [group] = viewInEnglish([manual({ investedCents: 2000, currentCents: 123_456 })]).groups;
    expect(group?.rows[0]).toMatchObject({ current: '$1,234.56', result: '+ $1,214.56' });
    expect(group?.rows[0]?.resultPercent).toBe('+6,072.8%');
  });

  test('marks a tiny share with the dot of the format', () => {
    const { groups } = viewInEnglish([
      manual({ currentCents: 1, assetClass: 'conta' }),
      manual({ currentCents: 10_000_000 }),
    ]);
    expect(groups.find((g) => g.name === 'Account and savings')?.percent).toBe('<0.1%');
  });

  test('formats a quantity with a dot and keeps the currency unit', () => {
    const [group] = viewInEnglish([
      auto({ assetClass: 'cambio', quantityE8: 123_450_000_000, priceCents: 519 }),
    ]).groups;
    expect(group?.rows[0]?.quantity).toBe('1,234.5 USD');
  });

  test('words the closing tiles and the chart in English', () => {
    const view = viewOf([manual()], { l10n: english }, [
      { month: '2026-10', totalCents: 1000, contributionsCents: 0 },
    ]);
    expect(view.tiles.map((tile) => tile.label)).toEqual([
      'Since the October closing',
      'October closing',
      'Last 12 months',
      'Portfolio result',
    ]);
    expect(view.chart.bars.at(-1)?.title).toBe('November 2026 · open');
  });
});

describe('wealthViewModel in English with reais', () => {
  test('keeps the comma of the real next to English words', () => {
    const [group] = viewOf([manual({ currentCents: 123_456 })], { l10n: localization('en', 'BRL') }).groups;
    expect(group?.rows[0]?.current).toBe('R$\u00a01.234,56');
    expect(viewOf([manual()], { l10n: localization('en', 'BRL') }).assetCount).toBe(
      '1 asset in 1 institution',
    );
  });
});

describe('wealthViewModel in Portuguese with US dollars', () => {
  test('keeps the Portuguese words next to dollar amounts', () => {
    const [group] = viewOf([manual({ currentCents: 123_456 })], {
      l10n: localization('pt-BR', 'USD'),
    }).groups;
    expect(group?.rows[0]?.current).toBe('$1,234.56');
    expect(group?.name).toBe('Tesouro Direto');
  });
});
