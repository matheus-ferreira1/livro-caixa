import type { Database } from 'bun:sqlite';
import type { Asset, AssetClass, Snapshot } from '@livro-caixa/domain';
import type { AssetRepository, SnapshotRepository } from '../../application/ports';

interface AssetRow {
  id: string;
  institution: string;
  name: string;
  asset_class: AssetClass;
  pricing: Asset['pricing'];
  quantity_e8: number | null;
  avg_price_cents: number | null;
  price_cents: number | null;
  invested_cents: number | null;
  current_cents: number | null;
  day_change_bps: number | null;
  updated_at: string;
}

const ASSET_COLUMNS = `id, institution, name, asset_class, pricing, quantity_e8, avg_price_cents,
  price_cents, invested_cents, current_cents, day_change_bps, updated_at`;

function toAsset(row: AssetRow): Asset {
  const base = {
    id: row.id,
    institution: row.institution,
    name: row.name,
    assetClass: row.asset_class,
    updatedAt: row.updated_at,
  };
  // The table's CHECK guarantees the required amounts of each pricing mode.
  if (row.pricing === 'manual') {
    return {
      ...base,
      pricing: 'manual',
      investedCents: row.invested_cents,
      currentCents: row.current_cents ?? 0,
    };
  }
  return {
    ...base,
    pricing: 'auto',
    quantityE8: row.quantity_e8 ?? 0,
    avgPriceCents: row.avg_price_cents,
    priceCents: row.price_cents ?? 0,
    dayChangeBps: row.day_change_bps,
  };
}

function toParams(asset: Asset) {
  const isAuto = asset.pricing === 'auto';
  return [
    asset.institution,
    asset.name,
    asset.assetClass,
    asset.pricing,
    isAuto ? asset.quantityE8 : null,
    isAuto ? asset.avgPriceCents : null,
    isAuto ? asset.priceCents : null,
    isAuto ? null : asset.investedCents,
    isAuto ? null : asset.currentCents,
    isAuto ? asset.dayChangeBps : null,
    asset.updatedAt,
    asset.id,
  ] as const;
}

export class SqliteAssetRepository implements AssetRepository {
  constructor(private readonly db: Database) {}

  list(): Asset[] {
    return this.db
      .query<AssetRow, []>(`SELECT ${ASSET_COLUMNS} FROM assets ORDER BY rowid`)
      .all()
      .map(toAsset);
  }

  findById(id: string): Asset | null {
    const row = this.db.query<AssetRow, [string]>(`SELECT ${ASSET_COLUMNS} FROM assets WHERE id = ?`).get(id);
    return row ? toAsset(row) : null;
  }

  insert(asset: Asset): void {
    this.db
      .query(
        `INSERT INTO assets (institution, name, asset_class, pricing, quantity_e8, avg_price_cents,
           price_cents, invested_cents, current_cents, day_change_bps, updated_at, id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...toParams(asset));
  }

  update(asset: Asset): void {
    this.db
      .query(
        `UPDATE assets SET institution = ?, name = ?, asset_class = ?, pricing = ?, quantity_e8 = ?,
           avg_price_cents = ?, price_cents = ?, invested_cents = ?, current_cents = ?,
           day_change_bps = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(...toParams(asset));
  }

  delete(id: string): boolean {
    return this.db.query('DELETE FROM assets WHERE id = ?').run(id).changes > 0;
  }
}

interface SnapshotRow {
  month: string;
  total_cents: number;
  contributions_cents: number;
}

export class SqliteSnapshotRepository implements SnapshotRepository {
  constructor(private readonly db: Database) {}

  list(): Snapshot[] {
    return this.db
      .query<SnapshotRow, []>('SELECT month, total_cents, contributions_cents FROM snapshots ORDER BY month')
      .all()
      .map((row) => ({
        month: row.month,
        totalCents: row.total_cents,
        contributionsCents: row.contributions_cents,
      }));
  }

  insert({ month, totalCents, contributionsCents }: Snapshot): void {
    this.db
      .query('INSERT INTO snapshots (month, total_cents, contributions_cents) VALUES (?, ?, ?)')
      .run(month, totalCents, contributionsCents);
  }
}
