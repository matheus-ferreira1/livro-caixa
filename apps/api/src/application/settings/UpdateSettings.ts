import type { Settings } from '@livro-caixa/domain';
import type { SettingsRepository } from '../ports';

export class UpdateSettings {
  constructor(private readonly settings: SettingsRepository) {}

  execute(next: Settings): Settings {
    this.settings.save(next);
    return next;
  }
}
