import { describe, expect, test } from 'bun:test';
import { anAutoAsset, aManualAsset, aSnapshot } from '../test/builders';
import { allocationSegments, groupAssets } from './allocation';
import { valueAssets } from './asset';
import { openMonth } from './closing';
import { evolutionSeries } from './evolution';
import { wealthKpis } from './kpis';
import { buildWealth } from './wealth';

const TODAY = '2026-11-03';

const monthlySnapshots = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2025, 9 + index, 1));
    return aSnapshot({
      month: date.toISOString().slice(0, 7),
      totalCents: 100_000 + index * 10_000,
      contributionsCents: 1000,
    });
  });

describe('openMonth', () => {
  test('is the month after the last closing', () => {
    expect(openMonth([aSnapshot({ month: '2026-09' })], TODAY)).toBe('2026-10');
  });

  test('is the previous calendar month before any closing', () => {
    expect(openMonth([], TODAY)).toBe('2026-10');
    expect(openMonth([], '2027-01-15')).toBe('2026-12');
  });
});

describe('wealthKpis', () => {
  const snapshots = [
    aSnapshot({ month: '2026-08', totalCents: 100_000, contributionsCents: 500 }),
    aSnapshot({ month: '2026-09', totalCents: 110_000, contributionsCents: 3000 }),
  ];

  test('compares the portfolio with the last closing', () => {
    const { sinceLastClosing } = wealthKpis(snapshots, 115_000, 100_000);
    expect(sinceLastClosing).toEqual({ month: '2026-09', changeCents: 5000 });
  });

  test('splits the last closing into contributions and yield', () => {
    const { lastClosing } = wealthKpis(snapshots, 115_000, 100_000);
    expect(lastClosing).toEqual({
      month: '2026-09',
      totalCents: 110_000,
      contributionsCents: 3000,
      yieldCents: 7000,
      changeCents: 10_000,
      changeRatio: 0.1,
    });
  });

  test('marks the first closing, which has nothing to compare with', () => {
    const { lastClosing } = wealthKpis([aSnapshot()], 100_000, 100_000);
    expect(lastClosing).toMatchObject({ changeCents: null, changeRatio: null, yieldCents: null });
  });

  test('measures 12 months back, ignoring the base month contributions', () => {
    const { lastYear } = wealthKpis(monthlySnapshots(14), 0, 0);
    expect(lastYear).toEqual({
      baseMonth: '2025-11',
      changeCents: 120_000,
      contributionsCents: 12_000,
      yieldCents: 108_000,
      ratio: 120_000 / 110_000,
    });
  });

  test('measures from the oldest closing when there is less than a year', () => {
    expect(wealthKpis(snapshots, 0, 0).lastYear).toMatchObject({
      baseMonth: '2026-08',
      changeCents: 10_000,
      contributionsCents: 3000,
    });
  });

  test('computes the portfolio result', () => {
    expect(wealthKpis([], 115_000, 100_000).result).toEqual({
      gainCents: 15_000,
      investedCents: 100_000,
      ratio: 0.15,
    });
  });

  test('has no closing tiles before the first closing', () => {
    const kpis = wealthKpis([], 0, 0);
    expect(kpis.sinceLastClosing).toBeNull();
    expect(kpis.lastClosing).toBeNull();
    expect(kpis.lastYear).toBeNull();
  });

  test('does not divide by a zero base', () => {
    const zero = [
      aSnapshot({ month: '2026-08', totalCents: 0 }),
      aSnapshot({ month: '2026-09', totalCents: 5000, contributionsCents: 5000 }),
    ];
    const kpis = wealthKpis(zero, 0, 0);
    expect(kpis.lastClosing?.changeRatio).toBeNull();
    expect(kpis.lastYear?.ratio).toBeNull();
    expect(kpis.result.ratio).toBe(0);
  });
});

describe('evolutionSeries', () => {
  test('shows the last 11 closings and the open month', () => {
    const series = evolutionSeries(monthlySnapshots(14), '2026-12', 999_000);
    expect(series.points).toHaveLength(12);
    expect(series.points[0]?.month).toBe('2026-01');
    expect(series.points[11]).toEqual({
      month: '2026-12',
      totalCents: 999_000,
      partial: true,
      changeCents: 999_000 - 230_000,
      contributionsCents: null,
      yieldCents: null,
    });
  });

  test('compares each closing with the previous one, even outside the window', () => {
    const series = evolutionSeries(monthlySnapshots(14), '2026-12', 0);
    expect(series.points[0]).toMatchObject({
      changeCents: 10_000,
      contributionsCents: 1000,
      yieldCents: 9000,
    });
  });

  test('has no change for the oldest closing', () => {
    const series = evolutionSeries(monthlySnapshots(1), '2025-11', 0);
    expect(series.points[0]).toMatchObject({ changeCents: null, yieldCents: null });
  });

  test('shows only the open month before the first closing', () => {
    const series = evolutionSeries([], '2026-10', 50_000);
    expect(series.points).toEqual([
      {
        month: '2026-10',
        totalCents: 50_000,
        partial: true,
        changeCents: null,
        contributionsCents: null,
        yieldCents: null,
      },
    ]);
  });

  test('has an axis that reaches the tallest bar', () => {
    const series = evolutionSeries(monthlySnapshots(3), '2026-01', 350_000);
    expect(series.axis.topCents).toBeGreaterThanOrEqual(350_000);
  });
});

describe('groupAssets', () => {
  const assets = valueAssets([
    aManualAsset({ name: 'Caução', institution: 'BB', assetClass: 'garantia', currentCents: 1000 }),
    aManualAsset({ name: 'Tesouro', institution: 'XP', assetClass: 'tesouro', currentCents: 5000 }),
    aManualAsset({ name: 'Selic', institution: 'BB', assetClass: 'tesouro', currentCents: 9000 }),
  ]);

  test('groups by class with the label and color, biggest first', () => {
    const groups = groupAssets(assets, 'class');
    expect(groups.map((g) => g.name)).toEqual(['Tesouro Direto', 'Garantias']);
    expect(groups[0]).toMatchObject({ color: '#EB6834', valueCents: 14_000 });
    expect(groups[0]?.share).toBeCloseTo(14 / 15);
  });

  test('sorts the assets of a group by value', () => {
    expect(groupAssets(assets, 'class')[0]?.assets.map((a) => a.name)).toEqual(['Selic', 'Tesouro']);
  });

  test('groups by institution with palette colors in order of first use', () => {
    const groups = groupAssets(assets, 'institution');
    expect(groups.map((g) => [g.name, g.color, g.valueCents])).toEqual([
      ['BB', '#2A78D6', 10_000],
      ['XP', '#EB6834', 5000],
    ]);
  });

  test('falls back to the neutral color once the palette runs out', () => {
    const many = valueAssets(
      Array.from({ length: 9 }, (_, index) =>
        aManualAsset({ institution: `Banco ${index}`, currentCents: 100 }),
      ),
    );
    const last = groupAssets(many, 'institution').find((g) => g.name === 'Banco 8');
    expect(last?.color).toBe('#9AA29D');
  });
});

describe('allocationSegments', () => {
  test('keeps the class order and leaves out invisible slivers', () => {
    const assets = valueAssets([
      aManualAsset({ assetClass: 'tesouro', currentCents: 10_000 }),
      aManualAsset({ assetClass: 'reserva', currentCents: 90_000 }),
      aManualAsset({ assetClass: 'conta', currentCents: 1 }),
    ]);
    const segments = allocationSegments(groupAssets(assets, 'class'));
    expect(segments.map((s) => s.name)).toEqual(['Reserva', 'Tesouro Direto']);
  });
});

describe('buildWealth', () => {
  test('sums the portfolio, counting unknown costs at their value', () => {
    const wealth = buildWealth({
      assets: [
        aManualAsset({ currentCents: 5110, investedCents: null }),
        aManualAsset({ currentCents: 10_000, investedCents: 8000 }),
      ],
      snapshots: [],
      today: TODAY,
    });
    expect(wealth).toMatchObject({
      totalCents: 15_110,
      investedCents: 13_110,
      kpis: { result: { gainCents: 2000 } },
      openMonth: '2026-10',
    });
    expect(wealth.assets).toHaveLength(2);
  });

  test('sums the daily move of the assets that have one', () => {
    const wealth = buildWealth({
      assets: [
        anAutoAsset({ quantityE8: 100_000_000, priceCents: 11_000, dayChangeBps: 1000 }),
        anAutoAsset({ quantityE8: 100_000_000, priceCents: 5000, dayChangeBps: null }),
        aManualAsset({ currentCents: 5000 }),
      ],
      snapshots: [],
      today: TODAY,
    });
    expect(wealth.dayChangeCents).toBe(1000);
  });
});
