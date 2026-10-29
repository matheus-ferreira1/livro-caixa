interface LedgerIconProps {
  size?: number;
}

/** The Livro-caixa mark: a ledger page with ruled lines, drawn in mint on dark. */
export function LedgerIcon({ size = 26 }: LedgerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--mint)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
