import { useCategoryCatalog, useSettings } from './api';
import { CategoriesSection } from './components/CategoriesSection';
import { PartnerSplitSection } from './components/PartnerSplitSection';

export function SettingsPage() {
  const { data: catalog } = useCategoryCatalog();
  const { data: settings } = useSettings();

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 pt-8 pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Preferências
        </span>
        <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em]">Configurações</h1>
      </div>
      {catalog && <CategoriesSection categories={catalog.categories} usage={catalog.usage} />}
      {settings && <PartnerSplitSection settings={settings} />}
    </div>
  );
}
