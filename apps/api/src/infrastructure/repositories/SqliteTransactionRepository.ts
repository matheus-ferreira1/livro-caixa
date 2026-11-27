import type { Database } from 'bun:sqlite';
import {
  isWeekday,
  MONTHLY_RECURRENCE,
  weeklyRecurrence,
  type MonthKey,
  type Recurrence,
  type Transaction,
  type TransactionType,
  type Weekday,
} from '@livro-caixa/domain';
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
  recurrence_frequency: Recurrence['frequency'];
  recurrence_weekdays: string | null;
}

const WEEKDAY_SEPARATOR = ',';

const storedWeekdays = (stored: string | null): Weekday[] =>
  (stored ?? '').split(WEEKDAY_SEPARATOR).map(Number).filter(isWeekday);

// A corrupt weekly row falls back to monthly rather than a series that would never produce a date.
const toRecurrence = (row: TransactionRow): Recurrence => {
  if (row.recurrence_frequency !== 'weekly') return MONTHLY_RECURRENCE;
  const weekdays = storedWeekdays(row.recurrence_weekdays);
  return weekdays.length > 0 ? weeklyRecurrence(weekdays) : MONTHLY_RECURRENCE;
};

const weekdaysColumn = (recurrence: Recurrence): string | null =>
  recurrence.frequency === 'weekly' ? recurrence.weekdays.join(WEEKDAY_SEPARATOR) : null;

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
  recurrence: toRecurrence(row),
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
    t.recurrence.frequency,
    weekdaysColumn(t.recurrence),
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
        `INSERT INTO transactions (date, description, note, type, category_id, value_cents, split, confirmed, recurring, series_id,
           recurrence_frequency, recurrence_weekdays, id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...toParams(t));
  }

  insertMany(transactions: Transaction[]): void {
    this.db.transaction(() => transactions.forEach((t) => this.insert(t)))();
  }

  update(t: Transaction): void {
    this.db
      .query(
        `UPDATE transactions SET date = ?, description = ?, note = ?, type = ?, category_id = ?, value_cents = ?,
           split = ?, confirmed = ?, recurring = ?, series_id = ?,
           recurrence_frequency = ?, recurrence_weekdays = ?, updated_at = unixepoch() * 1000
         WHERE id = ?`,
      )
      .run(...toParams(t));
  }

  delete(id: string): boolean {
    return this.db.query('DELETE FROM transactions WHERE id = ?').run(id).changes > 0;
  }
}
