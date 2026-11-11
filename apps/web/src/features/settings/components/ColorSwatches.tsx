import { CATEGORY_PALETTE, type CategoryColor } from '@livro-caixa/domain';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { cn } from '@/shared/lib/utils';

interface ColorSwatchesProps {
  label: string;
  value: string;
  onChange: (color: CategoryColor) => void;
  size?: 'md' | 'sm';
}

export function ColorSwatches({ label, value, onChange, size = 'md' }: ColorSwatchesProps) {
  const { t } = usePreferences();
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {CATEGORY_PALETTE.map((color, index) => (
        <button
          key={color}
          type="button"
          aria-label={t('settings.colorSwatch', index + 1)}
          aria-pressed={color === value}
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          className={cn(
            'cursor-pointer border-0',
            size === 'md' ? 'size-[30px] rounded-lg' : 'size-[26px] rounded-[7px]',
            color === value && 'shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#17201C]',
          )}
        />
      ))}
    </div>
  );
}
