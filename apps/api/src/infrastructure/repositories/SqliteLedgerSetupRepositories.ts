import type { Database } from 'bun:sqlite';
import type { Category, Currency, Language, Settings } from '@livro-caixa/domain';
import type { CategoryRepository, SettingsRepository } from '../../application/ports';

interface SettingsRow {
  partner_name: string;
  partner_share: number;
  language: Language;
  currency: Currency;
}

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Database) {}

  list(): Category[] {
    return this.db.query<Category, []>('SELECT id, name, type, color FROM categories').all();
  }

  findById(id: string): Category | null {
    return this.db
      .query<Category, [string]>('SELECT id, name, type, color FROM categories WHERE id = ?')
      .get(id);
  }

  insert({ id, name, type, color }: Category): void {
    this.db
      .query('INSERT INTO categories (id, name, type, color) VALUES (?, ?, ?, ?)')
      .run(id, name, type, color);
  }

  update({ id, name, color }: Category): void {
    this.db.query('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  }

  delete(id: string): void {
    this.db.query('DELETE FROM categories WHERE id = ?').run(id);
  }
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database) {}

  get(): Settings {
    const row = this.db
      .query<SettingsRow, []>(
        'SELECT partner_name, partner_share, language, currency FROM settings WHERE id = 1',
      )
      .get();
    if (!row) throw new Error('Settings row missing; migrations did not run');
    return {
      partnerName: row.partner_name,
      partnerShare: row.partner_share,
      language: row.language,
      currency: row.currency,
    };
  }

  save({ partnerName, partnerShare, language, currency }: Settings): void {
    this.db
      .query(
        'UPDATE settings SET partner_name = ?, partner_share = ?, language = ?, currency = ? WHERE id = 1',
      )
      .run(partnerName, partnerShare, language, currency);
  }
}
