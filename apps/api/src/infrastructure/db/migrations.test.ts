import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { MIGRATIONS } from './migrations';

const sqlOf = (id: string): string => {
  const migration = MIGRATIONS.find((candidate) => candidate.id === id);
  if (!migration) throw new Error(`Unknown migration ${id}`);
  return migration.sql;
};

describe('004_quote_status', () => {
  test('makes the next read check again every stored quote', () => {
    const db = new Database(':memory:');
    db.exec(sqlOf('003_wealth'));
    db.exec(`INSERT INTO assets (id, institution, name, asset_class, pricing, quantity_e8, price_cents,
      quote_checked_at, updated_at) VALUES ('a1', 'XP', 'MXRF11', 'fii', 'auto', 1, 1, 123, '2026-10-28')`);

    db.exec(sqlOf('004_quote_status'));

    expect(db.query('SELECT quote_checked_at, quoted_at, quote_failed FROM assets').get()).toEqual({
      quote_checked_at: null,
      quoted_at: null,
      quote_failed: 0,
    });
  });
});
