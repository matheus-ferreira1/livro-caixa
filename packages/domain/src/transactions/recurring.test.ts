import { describe, expect, test } from 'bun:test';
import { translator } from '../i18n/translate';
import { aTransaction } from '../test/builders';
import type { Weekday } from '../dates/dates';
import type { Transaction } from './transaction';
import {
  matchRecurringItems,
  recurringCandidates,
  recurringEntry,
  validateRecurringSelection,
} from './recurring';

const occurrence = (seriesId: string, date: string, overrides: Partial<Transaction> = {}) =>
  aTransaction({ seriesId, date, recurring: true, description: `Série ${seriesId}`, ...overrides });

const MONDAY: Weekday = 1;
const TUESDAY: Weekday = 2;
const FRIDAY: Weekday = 5;

const weekly = (seriesId: string, date: string, weekdays: Weekday[], overrides: Partial<Transaction> = {}) =>
  occurrence(seriesId, date, { recurrence: { frequency: 'weekly', weekdays }, ...overrides });

const datesOf = (candidates: { date: string }[]) => candidates.map((c) => c.date);

// August 2026 starts on a Saturday: five Mondays (3 … 31) and four Fridays (7 … 28).
const AUGUST_VISITS = ['03', '07', '10', '14', '17', '21', '24', '28', '31'].map((d) => `2026-08-${d}`);
const cleaner = (dates: string[]) => dates.map((date) => weekly('faxina', date, [MONDAY, FRIDAY]));

describe('recurringCandidates for a weekly series', () => {
  test('the first visit on Monday the 3rd offers the rest of the month’s Mondays and Fridays', () => {
    const first = weekly('faxina', '2026-08-03', [MONDAY, FRIDAY], { valueCents: 15_000 });
    const candidates = recurringCandidates([first], '2026-08');
    expect(datesOf(candidates)).toEqual(AUGUST_VISITS.slice(1));
    expect(
      candidates.every((c) => c.seriesId === 'faxina' && c.valueCents === 15_000 && c.source === first),
    ).toBe(true);
  });

  test('offers every matching date of a later month, from the source', () => {
    const candidates = recurringCandidates(cleaner(AUGUST_VISITS), '2026-09');
    expect(datesOf(candidates)).toEqual([
      '2026-09-04',
      '2026-09-07',
      '2026-09-11',
      '2026-09-14',
      '2026-09-18',
      '2026-09-21',
      '2026-09-25',
      '2026-09-28',
    ]);
    expect(candidates[0]?.source.date).toBe('2026-08-31');
    expect(candidates[0]?.source.recurrence).toEqual({ frequency: 'weekly', weekdays: [MONDAY, FRIDAY] });
  });

  test('a month already generated offers nothing more', () => {
    expect(recurringCandidates(cleaner(AUGUST_VISITS), '2026-08')).toEqual([]);
  });

  test('deleting an occurrence in the middle of the month does not bring it back', () => {
    const withoutHoliday = AUGUST_VISITS.filter((date) => date !== '2026-08-17');
    expect(recurringCandidates(cleaner(withoutHoliday), '2026-08')).toEqual([]);
  });

  test('deleting the last occurrences of the month offers those dates again', () => {
    const candidates = recurringCandidates(cleaner(AUGUST_VISITS.slice(0, -2)), '2026-08');
    expect(datesOf(candidates)).toEqual(['2026-08-28', '2026-08-31']);
  });

  test('generating November before October still offers all of October', () => {
    const series = [weekly('faxina', '2026-09-28', [MONDAY]), weekly('faxina', '2026-11-02', [MONDAY])];
    expect(datesOf(recurringCandidates(series, '2026-10'))).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
  });

  test('switching a monthly series to weekly mid-month offers the rest of that month', () => {
    const series = [occurrence('s1', '2026-10-03'), weekly('s1', '2026-11-03', [TUESDAY, FRIDAY])];
    expect(datesOf(recurringCandidates(series, '2026-11'))).toEqual([
      '2026-11-06',
      '2026-11-10',
      '2026-11-13',
      '2026-11-17',
      '2026-11-20',
      '2026-11-24',
      '2026-11-27',
    ]);
  });

  test('switching back to monthly makes the series monthly from that entry on', () => {
    const series = [weekly('s1', '2026-10-19', [MONDAY]), occurrence('s1', '2026-10-26')];
    expect(recurringCandidates(series, '2026-10')).toEqual([]);
    expect(datesOf(recurringCandidates(series, '2026-11'))).toEqual(['2026-11-26']);
  });

  test('ignores a series whose source is switched off or an acerto', () => {
    const series = [
      weekly('stopped', '2026-10-05', [MONDAY]),
      weekly('stopped', '2026-10-12', [MONDAY], { recurring: false }),
      weekly('acerto', '2026-10-05', [MONDAY], { type: 'acerto', categoryId: null }),
    ];
    expect(recurringCandidates(series, '2026-10')).toEqual([]);
    expect(recurringCandidates(series, '2026-11')).toEqual([]);
  });

  test('crosses the month boundary from a source on the last day', () => {
    const series = [weekly('faxina', '2026-08-31', [MONDAY])];
    expect(recurringCandidates(series, '2026-08')).toEqual([]);
    expect(datesOf(recurringCandidates(series, '2026-09'))).toEqual([
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
    ]);
  });

  test('reaches the leap day of February', () => {
    const series = [weekly('faxina', '2028-01-25', [TUESDAY])];
    expect(datesOf(recurringCandidates(series, '2028-02'))).toEqual([
      '2028-02-01',
      '2028-02-08',
      '2028-02-15',
      '2028-02-22',
      '2028-02-29',
    ]);
  });

  test('sorts weekly dates among the monthly candidates', () => {
    const candidates = recurringCandidates(
      [
        occurrence('aluguel', '2026-10-10', { description: 'Aluguel' }),
        weekly('faxina', '2026-10-26', [MONDAY]),
      ],
      '2026-11',
    );
    expect(datesOf(candidates)).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-10',
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
    ]);
  });
});

describe('recurringCandidates', () => {
  test('suggests the latest earlier occurrence of each series, on the same day and value', () => {
    const candidates = recurringCandidates(
      [
        occurrence('s1', '2026-09-05', { valueCents: 10_000 }),
        occurrence('s1', '2026-10-05', { valueCents: 12_000 }),
      ],
      '2026-11',
    );
    expect(candidates).toEqual([
      expect.objectContaining({ seriesId: 's1', date: '2026-11-05', valueCents: 12_000 }),
    ]);
    expect(candidates[0]?.source.date).toBe('2026-10-05');
  });

  test('caps the day at the last day of the month', () => {
    const [candidate] = recurringCandidates([occurrence('s1', '2026-01-31')], '2026-02');
    expect(candidate?.date).toBe('2026-02-28');
  });

  test('skips series already in the month, switched off, or made of acertos', () => {
    const candidates = recurringCandidates(
      [
        occurrence('in-month', '2026-10-05'),
        occurrence('in-month', '2026-11-02'),
        occurrence('stopped', '2026-09-05'),
        occurrence('stopped', '2026-10-05', { recurring: false }),
        occurrence('acerto', '2026-10-05', { type: 'acerto', categoryId: null }),
        occurrence('later', '2026-12-05'),
        aTransaction({ date: '2026-10-05', seriesId: null }),
      ],
      '2026-11',
    );
    expect(candidates).toEqual([]);
  });

  test('sorts by date, then by description', () => {
    const candidates = recurringCandidates(
      [
        occurrence('b', '2026-10-10', { description: 'Internet' }),
        occurrence('a', '2026-10-10', { description: 'Água' }),
        occurrence('c', '2026-10-01', { description: 'Aluguel' }),
      ],
      '2026-11',
    );
    expect(candidates.map((c) => c.source.description)).toEqual(['Aluguel', 'Água', 'Internet']);
  });
});

const t = translator('pt-BR');

describe('validateRecurringSelection', () => {
  const row = (overrides = {}) => ({
    description: 'Internet',
    date: '2026-11-10',
    valueCents: 9_990,
    ...overrides,
  });

  test('accepts dates in the month and positive values', () => {
    expect(validateRecurringSelection([row()], '2026-11', t)).toBeNull();
  });

  test('asks for at least one entry', () => {
    expect(validateRecurringSelection([], '2026-11', t)).toBe('Selecione ao menos um lançamento.');
  });

  test.each([
    { date: '2026-12-01' },
    { date: '2026-11-31' },
    { date: '' },
    { valueCents: 0 },
    { valueCents: null },
  ])('names the first row to review for %p', (patch) => {
    expect(validateRecurringSelection([row({ description: 'Luz', ...patch }), row()], '2026-11', t)).toBe(
      'Revise “Luz”: a data deve ser em Novembro 2026 e o valor maior que zero.',
    );
  });
});

describe('matchRecurringItems', () => {
  const candidates = recurringCandidates(
    [occurrence('luz', '2026-10-05'), weekly('faxina', '2026-10-30', [MONDAY, FRIDAY])],
    '2026-11',
  );
  const item = (seriesId: string, date: string) => ({ seriesId, date, valueCents: 9_000 });

  test('matches a monthly series by series alone, whatever date in the month was chosen', () => {
    const result = matchRecurringItems(candidates, [item('luz', '2026-11-20')]);
    expect(result).toEqual({
      status: 'matched',
      matched: [{ item: item('luz', '2026-11-20'), source: expect.objectContaining({ seriesId: 'luz' }) }],
    });
  });

  test('matches each weekly item by series and date, with the series source', () => {
    const items = [item('faxina', '2026-11-02'), item('faxina', '2026-11-06'), item('luz', '2026-11-05')];
    const result = matchRecurringItems(candidates, items);
    expect(result.status).toBe('matched');
    if (result.status !== 'matched') return;
    expect(result.matched.map((m) => [m.item.date, m.source.date])).toEqual([
      ['2026-11-02', '2026-10-30'],
      ['2026-11-06', '2026-10-30'],
      ['2026-11-05', '2026-10-05'],
    ]);
  });

  test.each([
    { name: 'a series that is no longer a candidate', items: [item('agua', '2026-11-05')] },
    { name: 'a monthly series sent twice', items: [item('luz', '2026-11-05'), item('luz', '2026-11-06')] },
    { name: 'a weekly date that is not a candidate', items: [item('faxina', '2026-11-03')] },
    { name: 'a weekly date sent twice', items: [item('faxina', '2026-11-02'), item('faxina', '2026-11-02')] },
  ])('is stale for $name', ({ items }) => {
    expect(matchRecurringItems(candidates, items)).toEqual({ status: 'stale' });
  });
});

describe('recurringEntry', () => {
  test('copies the source as a pending entry of the same series, without its note', () => {
    const source = occurrence('s1', '2026-10-05', { note: 'Leitura', split: true, confirmed: true });
    expect(recurringEntry(source, { id: 'n1', date: '2026-11-05', valueCents: 15_000 })).toEqual({
      ...source,
      id: 'n1',
      date: '2026-11-05',
      valueCents: 15_000,
      note: '',
      confirmed: false,
      recurring: true,
    });
  });

  test('copies the source’s weekly recurrence', () => {
    const source = weekly('faxina', '2026-10-30', [MONDAY, FRIDAY]);
    expect(recurringEntry(source, { id: 'n1', date: '2026-11-02', valueCents: 15_000 }).recurrence).toEqual({
      frequency: 'weekly',
      weekdays: [MONDAY, FRIDAY],
    });
  });
});
