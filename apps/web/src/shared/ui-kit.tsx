import { CircleAlert, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/** Inline banners from the design: errors, success notices and info boxes. */
export function AlertBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[10px] bg-expense-bg px-3.5 py-3 text-sm font-semibold text-expense"
    >
      <CircleAlert className="mt-px size-[18px] flex-none" strokeWidth={2.2} aria-hidden="true" />
      {children}
    </div>
  );
}

export function NoticeBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-[10px] bg-income-bg px-3.5 py-3 text-sm font-semibold text-income"
    >
      <Check className="size-[18px] flex-none" strokeWidth={2.2} aria-hidden="true" />
      {children}
    </div>
  );
}

export function InfoBox({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-[10px] bg-settlement-bg px-3.5 py-3 text-sm text-info-text', className)}>{children}</div>;
}
