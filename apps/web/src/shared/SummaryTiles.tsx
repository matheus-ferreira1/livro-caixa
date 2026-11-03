import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface TileDelta {
  label: string;
  tone: 'good' | 'bad' | 'neutral';
  direction: 'up' | 'down' | null;
}

export interface TileSpec {
  label: string;
  value: string;
  sub?: string;
  /** A line under the label. Tiles with one use the ink label and larger value of Visão geral. */
  hint?: string;
  /** A comparison under the value, colored by whether it is good news. */
  delta?: TileDelta;
  /** Text class of the label and dot on light tiles; without it, a neutral label and no dot. */
  tone?: 'income' | 'expense' | 'settlement';
  /** The dark balance tile. */
  dark?: boolean;
  /** Colors the value as a negative balance. */
  negative?: boolean;
  /** Colors the value as good or bad news; a dark tile uses its on-dark shades. */
  valueTone?: TileDelta['tone'];
}

const TONE: Record<NonNullable<TileSpec['tone']>, { text: string; dot: string }> = {
  income: { text: 'text-income', dot: 'bg-income' },
  expense: { text: 'text-expense', dot: 'bg-expense' },
  settlement: { text: 'text-settlement', dot: 'bg-settlement' },
};

const DELTA_TEXT: Record<TileDelta['tone'], string> = {
  good: 'text-income',
  bad: 'text-expense',
  neutral: 'text-muted-foreground',
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

const VALUE_TEXT: Record<TileDelta['tone'], string> = {
  good: 'text-income',
  bad: 'text-expense',
  neutral: 'text-ink',
};

const VALUE_TEXT_ON_DARK: Record<TileDelta['tone'], string> = {
  good: 'text-mint',
  bad: 'text-negative-on-dark',
  neutral: 'text-white',
};

function Tile({ label, value, sub, hint, delta, tone, dark, negative, valueTone }: TileSpec) {
  const toneClasses = tone ? TONE[tone] : null;
  return (
    <section
      aria-label={label}
      className={cn(
        'flex flex-col rounded-[14px] px-5 py-[18px]',
        hint ? 'gap-1' : 'gap-1.5',
        dark ? 'bg-ink text-background' : 'border bg-card',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-2 text-sm font-semibold',
          dark ? 'text-on-dark-muted' : (toneClasses?.text ?? (hint ? 'text-ink' : 'text-icon')),
        )}
      >
        {toneClasses && <span aria-hidden="true" className={cn('size-2 rounded-full', toneClasses.dot)} />}
        {label}
      </span>
      {hint && (
        <span className={cn('text-[13px]', dark ? 'text-on-dark-muted' : 'text-muted-foreground')}>
          {hint}
        </span>
      )}
      <span
        className={cn(
          'font-mono font-semibold tracking-[-0.02em]',
          hint ? 'mt-1.5 text-[28px]' : 'text-[26px]',
          dark && (negative ? 'text-negative-on-dark' : 'text-white'),
          !dark && negative && 'text-expense',
          valueTone && (dark ? VALUE_TEXT_ON_DARK : VALUE_TEXT)[valueTone],
        )}
      >
        {value}
      </span>
      {sub && (
        <span className={cn('text-[13px]', dark ? 'text-on-dark-muted' : 'text-muted-foreground')}>
          {sub}
        </span>
      )}
      {delta?.label && <DeltaLine {...delta} onDark={dark} />}
    </section>
  );
}

function DeltaLine({ label, tone, direction, onDark }: TileDelta & { onDark?: boolean }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 text-[13px] font-semibold',
        onDark ? 'text-on-dark-muted' : DELTA_TEXT[tone],
      )}
    >
      <DeltaArrow direction={direction} className="size-3.5" />
      {label}
    </span>
  );
}

export function DeltaArrow({ direction, className }: Pick<TileDelta, 'direction'> & { className?: string }) {
  if (direction === 'up') return <ArrowUp className={className} strokeWidth={2.4} aria-hidden="true" />;
  if (direction === 'down') return <ArrowDown className={className} strokeWidth={2.4} aria-hidden="true" />;
  return null;
}

export const deltaTextClass = (tone: TileDelta['tone']): string => DELTA_TEXT[tone];
