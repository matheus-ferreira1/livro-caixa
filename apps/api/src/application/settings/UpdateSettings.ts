import type { Settings, SettingsInput } from '@livro-caixa/domain';
import type { SettingsRepository } from '../ports';

export class UpdateSettings {
  constructor(private readonly settings: SettingsRepository) {}

  /** Each section of Configurações sends only its own fields; the rest keep their stored value. */
  execute(changes: SettingsInput): Settings {
    const next = { ...this.settings.get(), ...changes };
    this.settings.save(next);
    return next;
  }
}
