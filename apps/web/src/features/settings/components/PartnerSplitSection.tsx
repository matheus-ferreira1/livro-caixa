import { displayPartnerName, PARTNER_SHARE_STEP, type Settings } from '@livro-caixa/domain';
import { useEffect, useId, useState } from 'react';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { InfoBox } from '@/shared/ui-kit';
import { useSaveSettings } from '../api';
import { shareExampleText, shareLabel } from '../view-model';
import { settingsInputClass } from './CategoriesSection';

/** Changes save on their own, as in the design; the delay batches typing and slider drags. */
const SAVE_DELAY_MS = 500;

const isSaved = (draft: Settings, saved: Settings) =>
  draft.partnerName.trim() === saved.partnerName && draft.partnerShare === saved.partnerShare;

export function PartnerSplitSection({ settings }: { settings: Settings }) {
  const l10n = usePreferences();
  const { t } = l10n;
  const nameId = useId();
  const shareId = useId();
  const [draft, setDraft] = useState(settings);
  const { mutate: save } = useSaveSettings();
  const partnerName = displayPartnerName(draft, t);

  useEffect(() => {
    if (isSaved(draft, settings)) return;
    const timer = setTimeout(
      () => save({ partnerName: draft.partnerName, partnerShare: draft.partnerShare }),
      SAVE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [draft, settings, save]);

  return (
    <section aria-labelledby="split-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="split-title" className="m-0 text-xl font-bold">
          {t('settings.splitTitle')}
        </h2>
        <p className="m-0 max-w-[640px] text-muted-foreground">{t('settings.splitIntro')}</p>
      </div>
      <div className="flex flex-wrap items-end gap-6 rounded-[14px] border bg-card p-5">
        <div className="flex flex-[1_1_260px] flex-col gap-1.5">
          <label htmlFor={nameId} className="text-sm font-semibold">
            {t('settings.partnerName')}
          </label>
          <input
            id={nameId}
            type="text"
            value={draft.partnerName}
            onChange={(event) => setDraft({ ...draft, partnerName: event.target.value })}
            className={settingsInputClass}
          />
        </div>
        <div className="flex flex-[2_1_360px] flex-col gap-1.5">
          <label htmlFor={shareId} className="text-sm font-semibold">
            {t('settings.partnerShare', partnerName)}
          </label>
          <div className="flex min-h-11 items-center gap-3.5">
            <input
              id={shareId}
              type="range"
              min={0}
              max={100}
              step={PARTNER_SHARE_STEP}
              value={draft.partnerShare}
              onChange={(event) => setDraft({ ...draft, partnerShare: Number(event.target.value) })}
              className="flex-1 accent-settlement"
            />
            <span className="min-w-[132px] text-right font-mono font-semibold">
              {shareLabel(partnerName, draft.partnerShare)}
            </span>
          </div>
        </div>
        <InfoBox className="basis-full">{shareExampleText(partnerName, draft.partnerShare, l10n)}</InfoBox>
      </div>
    </section>
  );
}
