import { randomUUID } from 'node:crypto';
import {
  ASSET_MESSAGES,
  toAsset,
  validateAssetFields,
  type Asset,
  type AssetInput,
} from '@livro-caixa/domain';
import { ApplicationError } from '../errors';
import type { AssetRepository } from '../ports';

const notFound = () => new ApplicationError('not_found', ASSET_MESSAGES.notFound);

function assertValid(input: AssetInput): void {
  const error = validateAssetFields(input);
  if (error) throw new ApplicationError('validation_error', error);
}

export class CreateAsset {
  constructor(
    private readonly assets: AssetRepository,
    private readonly newId: () => string = randomUUID,
  ) {}

  execute(input: AssetInput): Asset {
    assertValid(input);
    const asset = toAsset(this.newId(), input, null);
    this.assets.insert(asset);
    return asset;
  }
}

export class UpdateAsset {
  constructor(private readonly assets: AssetRepository) {}

  execute(id: string, input: AssetInput): Asset {
    const existing = this.assets.findById(id);
    if (!existing) throw notFound();
    assertValid(input);
    const asset = toAsset(id, input, existing);
    this.assets.update(asset);
    return asset;
  }
}

export class DeleteAsset {
  constructor(private readonly assets: AssetRepository) {}

  execute(id: string): void {
    if (!this.assets.delete(id)) throw notFound();
  }
}
