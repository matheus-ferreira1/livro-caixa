import type { ReactNode } from 'react';

/** The 44px outline button on either side of a page's month or year heading. */
export function ArrowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-[10px] border bg-card text-ink hover:bg-accent"
    >
      {children}
    </button>
  );
}
