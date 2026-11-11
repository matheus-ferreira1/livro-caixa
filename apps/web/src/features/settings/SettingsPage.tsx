import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { useCategoryCatalog, useSettings } from './api';
import { CategoriesSection } from './components/CategoriesSection';
import { PartnerSplitSection } from './components/PartnerSplitSection';
import { PreferencesSection } from './components/PreferencesSection';

export function SettingsPage() {
  const { data: catalog } = useCategoryCatalog();
  const { data: settings } = useSettings();
  const { t } = usePreferences();

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {t('settings.eyebrow')}
        </span>
        <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em]">{t('nav.settings')}</h1>
      </div>
      {catalog && <CategoriesSection categories={catalog.categories} usage={catalog.usage} />}
      {settings && <PartnerSplitSection settings={settings} />}
      <PreferencesSection />
    </div>
  );
}
