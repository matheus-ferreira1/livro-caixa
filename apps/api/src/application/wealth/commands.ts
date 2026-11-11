import { randomUUID } from 'node:crypto';
import {
  applyClosing,
  closingAvailable,
  openMonth,
  toAsset,
  validateAssetFields,
  type Asset,
  type AssetInput,
  type ClosingRequest,
  type Snapshot,
} from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { AssetRepository, SnapshotRepository, TranslateProvider } from '../ports';

const notFound = (translate: TranslateProvider) =>
  new ApplicationError('not_found', translate()('asset.notFound'));

function assertValid(input: AssetInput, translate: TranslateProvider): void {
  const error = validateAssetFields(input, translate());
  if (error) throw new ApplicationError('validation_error', error);
}

export class CreateAsset {
  constructor(
    private readonly assets: AssetRepository,
    private readonly translate: TranslateProvider,
    private readonly newId: () => string = randomUUID,
  ) {}

  execute(input: AssetInput): Asset {
    assertValid(input, this.translate);
    const asset = toAsset(this.newId(), input, null);
    this.assets.insert(asset);
    return asset;
  }
}

export class UpdateAsset {
  constructor(
    private readonly assets: AssetRepository,
    private readonly translate: TranslateProvider,
  ) {}

  execute(id: string, input: AssetInput): Asset {
    const existing = this.assets.findById(id);
    if (!existing) throw notFound(this.translate);
    assertValid(input, this.translate);
    const asset = toAsset(id, input, existing);
    this.assets.update(asset);
    return asset;
  }
}

export class DeleteAsset {
  constructor(
    private readonly assets: AssetRepository,
    private readonly translate: TranslateProvider,
  ) {}

  execute(id: string): void {
    if (!this.assets.delete(id)) throw notFound(this.translate);
  }
}

/**
 * Registers the open month's closing. The month and the manual assets are checked again here,
 * so a second tab or a double click is refused instead of closing the next month early.
 */
export class RegisterClosing {
  constructor(
    private readonly assets: AssetRepository,
    private readonly snapshots: SnapshotRepository,
    private readonly translate: TranslateProvider,
  ) {}

  execute(request: ClosingRequest): Snapshot {
    const assets = this.assets.list();
    const snapshots = this.snapshots.list();
    const isOpen =
      request.month === openMonth(snapshots, request.today) &&
      closingAvailable(snapshots, assets.length, request.today);
    const manual = assets.filter((asset) => asset.pricing === 'manual');
    const itemIds = new Set(request.items.map((item) => item.assetId));
    const coversManual =
      itemIds.size === request.items.length &&
      itemIds.size === manual.length &&
      manual.every((asset) => itemIds.has(asset.id));
    if (!isOpen || !coversManual) throw new ApplicationError('conflict', this.translate()('closing.stale'));

    const negative = request.items.find((item) => item.currentCents < 0);
    const asset = negative && manual.find((candidate) => candidate.id === negative.assetId);
    if (asset) {
      throw new ApplicationError(
        'validation_error',
        this.translate()('closing.review', asset.name, asset.institution),
      );
    }

    const { snapshot, assets: updated } = applyClosing(assets, request);
    this.snapshots.registerClosing(snapshot, updated);
    return snapshot;
  }
}
