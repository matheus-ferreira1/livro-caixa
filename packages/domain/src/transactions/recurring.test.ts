import { describe, expect, test } from 'bun:test';
import { translator } from '../i18n/translate';
import { aTransaction } from '../test/builders';
import { recurringCandidates, recurringEntry, validateRecurringSelection } from './recurring';

const occurrence = (seriesId: string, date: string, overrides = {}) =>
  aTransaction({ seriesId, date, recurring: true, description: `Série ${seriesId}`, ...overrides });

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
});
