import type { Database } from 'bun:sqlite';
import type { Category, Settings } from '@livro-caixa/domain';
import type { CategoryRepository, SettingsRepository } from '../../application/ports';

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
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database) {}

  get(): Settings {
    const row = this.db
      .query<{ partner_name: string; partner_share: number }, []>(
        'SELECT partner_name, partner_share FROM settings WHERE id = 1',
      )
      .get();
    if (!row) throw new Error('Settings row missing; migrations did not run');
    return { partnerName: row.partner_name, partnerShare: row.partner_share };
  }
}
