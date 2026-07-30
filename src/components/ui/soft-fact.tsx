import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SoftFactProps = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  className?: string;
};

/** Muted label + value tile used on detail pages (booking, transaction, settlement). */
export function SoftFact({ label, value, highlight = false, className }: SoftFactProps) {
  return (
    <div className={cn('min-w-0 rounded-xl bg-muted/40 px-3 py-2.5', className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div
        className={cn(
          'mt-0.5 break-words text-sm font-medium',
          highlight ? 'font-semibold text-brand' : 'text-foreground',
        )}
      >
        {value}
      </div>
    </div>
  );
}

export type { SoftFactProps };
