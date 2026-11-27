import { describe, expect, test } from 'bun:test';
import { MONTHLY_RECURRENCE, weeklyRecurrence, type Transaction } from '@livro-caixa/domain';
import { openDatabase } from '../db/database';
import { SqliteTransactionRepository } from './SqliteTransactionRepository';

const entry = (id: string): Transaction => ({
  id,
  date: '2026-11-05',
  description: 'Internet fibra',
  note: '',
  type: 'despesa',
  categoryId: 'c-mercado',
  valueCents: 11_990,
  split: false,
  confirmed: false,
  recurring: true,
  seriesId: 's1',
  recurrence: MONTHLY_RECURRENCE,
});

describe('SqliteTransactionRepository.insertMany', () => {
  test('inserts every entry', () => {
    const repository = new SqliteTransactionRepository(openDatabase(':memory:'));
    repository.insertMany([entry('a'), entry('b')]);
    expect(repository.listByMonth('2026-11').map((t) => t.id)).toEqual(['a', 'b']);
  });

  test('inserts nothing when one entry fails', () => {
    const repository = new SqliteTransactionRepository(openDatabase(':memory:'));
    expect(() => repository.insertMany([entry('a'), entry('a')])).toThrow();
    expect(repository.listByMonth('2026-11')).toEqual([]);
  });
});

describe('SqliteTransactionRepository recurrence', () => {
  test.each([
    ['monthly', MONTHLY_RECURRENCE],
    ['weekly', weeklyRecurrence([1, 5])],
  ])('round-trips a %s recurrence through insert and update', (_name, recurrence) => {
    const repository = new SqliteTransactionRepository(openDatabase(':memory:'));
    repository.insert({
      ...entry('a'),
      recurrence: MONTHLY_RECURRENCE === recurrence ? weeklyRecurrence([2]) : MONTHLY_RECURRENCE,
    });
    repository.update({ ...entry('a'), recurrence });
    expect(repository.findById('a')?.recurrence).toEqual(recurrence);
  });

  const storeWeekdays = (database: ReturnType<typeof openDatabase>, weekdays: string | null) =>
    database.run(
      "UPDATE transactions SET recurrence_frequency = 'weekly', recurrence_weekdays = ? WHERE id = 'a'",
      [weekdays],
    );

  test('drops stored weekdays that are not 0-6', () => {
    const database = openDatabase(':memory:');
    const repository = new SqliteTransactionRepository(database);
    repository.insert(entry('a'));
    storeWeekdays(database, '1,9,x,5');
    expect(repository.findById('a')?.recurrence).toEqual(weeklyRecurrence([1, 5]));
  });

  test('falls back to monthly when a weekly row has no valid weekday', () => {
    const database = openDatabase(':memory:');
    const repository = new SqliteTransactionRepository(database);
    repository.insert(entry('a'));
    storeWeekdays(database, '9,x');
    expect(repository.findById('a')?.recurrence).toEqual(MONTHLY_RECURRENCE);
  });
});
