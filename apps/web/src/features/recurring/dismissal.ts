import type { MonthKey } from '@livro-caixa/domain';
import { useState } from 'react';

const storageKey = (month: MonthKey) => `livro-caixa:recurring-dismissed:${month}`;

// Storage can be unavailable (private windows, blocked site data); the banner then just shows again.
function isStoredDismissed(month: MonthKey): boolean {
  try {
    return localStorage.getItem(storageKey(month)) !== null;
  } catch {
    return false;
  }
}

function storeDismissed(month: MonthKey): void {
  try {
    localStorage.setItem(storageKey(month), '1');
  } catch {
    // Still hidden for this visit through component state.
  }
}

/** "Agora não" on the recurring banner: hides it for that month, in this browser. */
export function useRecurringDismissal(month: MonthKey) {
  const [dismissedNow, setDismissedNow] = useState<ReadonlySet<MonthKey>>(new Set());
  return {
    dismissed: dismissedNow.has(month) || isStoredDismissed(month),
    dismiss: () => {
      storeDismissed(month);
      setDismissedNow((previous) => new Set(previous).add(month));
    },
  };
}
