import { cn } from '@/shared/lib/utils';

export interface TileSpec {
  label: string;
  value: string;
  sub: string;
  /** Text class of the label and dot on light tiles; without it, a neutral label and no dot. */
  tone?: 'income' | 'expense' | 'settlement';
  /** The dark balance tile. */
  dark?: boolean;
  /** Colors the value as a negative balance. */
  negative?: boolean;
}

const TONE: Record<NonNullable<TileSpec['tone']>, { text: string; dot: string }> = {
  income: { text: 'text-income', dot: 'bg-income' },
  expense: { text: 'text-expense', dot: 'bg-expense' },
  settlement: { text: 'text-settlement', dot: 'bg-settlement' },
};

export function SummaryTiles({ tiles }: { tiles: TileSpec[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
      {tiles.map((tile) => (
        <Tile key={tile.label} {...tile} />
      ))}
    </div>
  );
}

function Tile({ label, value, sub, tone, dark, negative }: TileSpec) {
  const toneClasses = tone ? TONE[tone] : null;
  return (
    <section
      aria-label={label}
      className={cn(
        'flex flex-col gap-1.5 rounded-[14px] px-5 py-[18px]',
        dark ? 'bg-ink text-background' : 'border bg-card',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-2 text-sm font-semibold',
          dark ? 'text-on-dark-muted' : (toneClasses?.text ?? 'text-icon'),
        )}
      >
        {toneClasses && <span aria-hidden="true" className={cn('size-2 rounded-full', toneClasses.dot)} />}
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[26px] font-semibold tracking-[-0.02em]',
          dark && (negative ? 'text-negative-on-dark' : 'text-white'),
          !dark && negative && 'text-expense',
        )}
      >
        {value}
      </span>
      <span className={cn('text-[13px]', dark ? 'text-on-dark-muted' : 'text-muted-foreground')}>{sub}</span>
    </section>
  );
}
