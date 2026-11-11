export interface Migration {
  id: string;
  sql: string;
}

/** Append-only. Never edit a migration that has shipped; add a new one instead. */
export const MIGRATIONS: Migration[] = [
  {
    id: '001_users_and_sessions',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        persistent INTEGER NOT NULL
      );
      CREATE INDEX sessions_user_id ON sessions(user_id);
    `,
  },
  {
    id: '002_ledger',
    sql: `
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
        color TEXT NOT NULL,
        UNIQUE (type, name COLLATE NOCASE)
      );
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL CHECK (type IN ('receita', 'despesa', 'acerto')),
        category_id TEXT REFERENCES categories(id),
        value_cents INTEGER NOT NULL CHECK (value_cents > 0),
        split INTEGER NOT NULL DEFAULT 0,
        confirmed INTEGER NOT NULL DEFAULT 0,
        recurring INTEGER NOT NULL DEFAULT 0,
        series_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
      CREATE INDEX transactions_date ON transactions(date);
      CREATE INDEX transactions_series ON transactions(series_id);
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        partner_name TEXT NOT NULL,
        partner_share INTEGER NOT NULL CHECK (partner_share BETWEEN 0 AND 100)
      );
      INSERT INTO settings (id, partner_name, partner_share) VALUES (1, 'Companheira', 50);
      INSERT INTO categories (id, name, type, color) VALUES
        ('c-salario', 'Salário', 'receita', '#2A78D6'),
        ('c-aluguel', 'Aluguel', 'receita', '#1BAF7A'),
        ('c-freela', 'Freelance', 'receita', '#6250D6'),
        ('c-cartao', 'Cartão de crédito', 'despesa', '#2A78D6'),
        ('c-moradia', 'Moradia', 'despesa', '#EB6834'),
        ('c-mercado', 'Mercado', 'despesa', '#1BAF7A'),
        ('c-saude', 'Saúde', 'despesa', '#EDA100'),
        ('c-energia', 'Energia', 'despesa', '#E87BA4'),
        ('c-agua', 'Água', 'despesa', '#008300'),
        ('c-internet', 'Internet', 'despesa', '#6250D6'),
        ('c-transporte', 'Transporte', 'despesa', '#E34948'),
        ('c-lazer', 'Lazer', 'despesa', '#6250D6');
    `,
  },
  {
    id: '003_wealth',
    sql: `
      CREATE TABLE assets (
        id TEXT PRIMARY KEY,
        institution TEXT NOT NULL,
        name TEXT NOT NULL,
        asset_class TEXT NOT NULL CHECK (
          asset_class IN ('reserva', 'tesouro', 'garantia', 'etf', 'fii', 'cripto', 'cambio', 'conta')
        ),
        pricing TEXT NOT NULL CHECK (pricing IN ('auto', 'manual')),
        quantity_e8 INTEGER,
        avg_price_cents INTEGER,
        price_cents INTEGER,
        invested_cents INTEGER,
        current_cents INTEGER,
        day_change_bps INTEGER,
        quote_checked_at INTEGER,
        updated_at TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        CHECK (
          (pricing = 'auto' AND quantity_e8 IS NOT NULL AND price_cents IS NOT NULL)
          OR (pricing = 'manual' AND current_cents IS NOT NULL)
        )
      );
      CREATE TABLE snapshots (
        month TEXT PRIMARY KEY,
        total_cents INTEGER NOT NULL,
        contributions_cents INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );
    `,
  },
  {
    // Past checks do not say whether they found a quote, so the next read asks again
    // and until then no daily change stands.
    id: '004_quote_status',
    sql: `
      ALTER TABLE assets ADD COLUMN quoted_at INTEGER;
      ALTER TABLE assets ADD COLUMN quote_failed INTEGER NOT NULL DEFAULT 0;
      UPDATE assets SET quote_checked_at = NULL, day_change_bps = NULL;
    `,
  },
  {
    // Display-only choices for the whole instance; no stored amount or text is converted.
    id: '005_language_and_currency',
    sql: `
      ALTER TABLE settings ADD COLUMN language TEXT NOT NULL DEFAULT 'pt-BR'
        CHECK (language IN ('pt-BR', 'en'));
      ALTER TABLE settings ADD COLUMN currency TEXT NOT NULL DEFAULT 'BRL'
        CHECK (currency IN ('BRL', 'USD', 'EUR', 'GBP'));
    `,
  },
];
