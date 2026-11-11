import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { MIGRATIONS } from './migrations';

const sqlOf = (id: string): string => {
  const migration = MIGRATIONS.find((candidate) => candidate.id === id);
  if (!migration) throw new Error(`Unknown migration ${id}`);
  return migration.sql;
};

describe('004_quote_status', () => {
  test('makes the next read check every stored quote and drops daily changes with no quote', () => {
    const db = new Database(':memory:');
    db.exec(sqlOf('003_wealth'));
    db.exec(`INSERT INTO assets (id, institution, name, asset_class, pricing, quantity_e8, price_cents,
      day_change_bps, quote_checked_at, updated_at)
      VALUES ('a1', 'XP', 'MXRF11', 'fii', 'auto', 1, 1, 25, 123, '2026-10-28')`);

    db.exec(sqlOf('004_quote_status'));

    expect(
      db.query('SELECT day_change_bps, quote_checked_at, quoted_at, quote_failed FROM assets').get(),
    ).toEqual({
      day_change_bps: null,
      quote_checked_at: null,
      quoted_at: null,
      quote_failed: 0,
    });
  });
});

describe('005_language_and_currency', () => {
  const columns = 'SELECT language, currency FROM settings WHERE id = 1';

  test('keeps an existing instance in pt-BR and BRL', () => {
    const db = new Database(':memory:');
    db.exec(sqlOf('002_ledger'));

    db.exec(sqlOf('005_language_and_currency'));

    expect(db.query(columns).get()).toEqual({ language: 'pt-BR', currency: 'BRL' });
  });

  test.each([
    ['language', 'fr'],
    ['currency', 'JPY'],
  ])('rejects an unknown %s', (column, value) => {
    const db = new Database(':memory:');
    db.exec(sqlOf('002_ledger'));
    db.exec(sqlOf('005_language_and_currency'));

    expect(() => db.query(`UPDATE settings SET ${column} = ? WHERE id = 1`).run(value)).toThrow();
  });
});
