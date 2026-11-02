import { describe, expect, test } from 'bun:test';
import type { Transaction } from '@livro-caixa/domain';
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
