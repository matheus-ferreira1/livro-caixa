import { cn } from '@/shared/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/** The design's segmented control: a grey track with a raised white active segment. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className={cn('flex w-auto flex-wrap gap-0.5 rounded-xl bg-track p-[3px] shadow-none', className)}
    >
      {options.map(([key, text]) => (
        <ToggleGroupItem
          key={key}
          value={key}
          className={cn(
            'flex-none rounded-[9px]! border-0 px-3.5 text-sm font-semibold text-icon shadow-none hover:bg-transparent hover:text-ink',
            'data-[state=on]:bg-card data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_2px_rgba(23,32,28,0.14)]',
            size === 'sm' ? 'h-9 min-w-10 px-3' : 'h-10',
          )}
        >
          {text}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
