import type { Database } from 'bun:sqlite';
import type { MonthKey, Transaction, TransactionType } from '@livro-caixa/domain';
import type { TransactionRepository } from '../../application/ports';

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  note: string;
  type: TransactionType;
  category_id: string | null;
  value_cents: number;
  split: number;
  confirmed: number;
  recurring: number;
  series_id: string | null;
}

const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  date: row.date,
  description: row.description,
  note: row.note,
  type: row.type,
  categoryId: row.category_id,
  valueCents: row.value_cents,
  split: row.split === 1,
  confirmed: row.confirmed === 1,
  recurring: row.recurring === 1,
  seriesId: row.series_id,
});

const toParams = (t: Transaction) =>
  [
    t.date,
    t.description,
    t.note,
    t.type,
    t.categoryId,
    t.valueCents,
    t.split ? 1 : 0,
    t.confirmed ? 1 : 0,
    t.recurring ? 1 : 0,
    t.seriesId,
    t.id,
  ] as const;

export class SqliteTransactionRepository implements TransactionRepository {
  constructor(private readonly db: Database) {}

  listByMonth(month: MonthKey): Transaction[] {
    return this.db
      .query<TransactionRow, [string]>(
        'SELECT * FROM transactions WHERE substr(date, 1, 7) = ? ORDER BY date, description',
      )
      .all(month)
      .map(toTransaction);
  }

  listAll(): Transaction[] {
    return this.db.query<TransactionRow, []>('SELECT * FROM transactions').all().map(toTransaction);
  }

  findById(id: string): Transaction | null {
    const row = this.db.query<TransactionRow, [string]>('SELECT * FROM transactions WHERE id = ?').get(id);
    return row ? toTransaction(row) : null;
  }

  insert(t: Transaction): void {
    this.db
      .query(
        `INSERT INTO transactions (date, description, note, type, category_id, value_cents, split, confirmed, recurring, series_id, id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...toParams(t));
  }

  update(t: Transaction): void {
    this.db
      .query(
        `UPDATE transactions SET date = ?, description = ?, note = ?, type = ?, category_id = ?, value_cents = ?,
           split = ?, confirmed = ?, recurring = ?, series_id = ?, updated_at = unixepoch() * 1000
         WHERE id = ?`,
      )
      .run(...toParams(t));
  }

  delete(id: string): boolean {
    return this.db.query('DELETE FROM transactions WHERE id = ?').run(id).changes > 0;
  }
}
