import { buildWealth, type IsoDate, type Wealth } from '@livro-caixa/domain';
import type { AssetRepository, SnapshotRepository } from '../ports';

export class GetWealth {
  constructor(
    private readonly assets: AssetRepository,
    private readonly snapshots: SnapshotRepository,
  ) {}

  execute(today: IsoDate): Wealth {
    return buildWealth({ assets: this.assets.list(), snapshots: this.snapshots.list(), today });
  }
}
