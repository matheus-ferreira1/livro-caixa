import { RefreshCw, RefreshCwOff } from 'lucide-react';
import type { AssetRow } from '../view-model';

export function PricingTag({ tag }: { tag: AssetRow['pricingTag'] }) {
  if (tag.kind === 'manual') return <span>{tag.label}</span>;
  if (tag.kind === 'updated') {
    return (
      <span className="flex items-center gap-1 text-income">
        <RefreshCw className="size-3" aria-hidden="true" />
        {tag.label}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full border border-dashed border-pending-border bg-pending-bg px-2 font-semibold text-pending">
      <RefreshCwOff className="size-3" aria-hidden="true" />
      {tag.label}
    </span>
  );
}
