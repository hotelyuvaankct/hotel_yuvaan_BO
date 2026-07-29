import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** @deprecated Prefer `tone`. Kept for migration. */
type LegacyBadgeVariant = 'default' | 'secondary' | 'outline' | 'gold' | 'success' | 'warning' | 'danger';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  /** @deprecated Use `tone` instead. */
  variant?: LegacyBadgeVariant;
};

const toneStyles: Record<BadgeTone, string> = {
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning/15 text-warning-foreground',
  danger: 'bg-destructive/10 text-destructive',
  /* info reuses muted until a dedicated --info token is approved */
  info: 'bg-muted text-muted-foreground',
  neutral: 'bg-muted text-muted-foreground',
};

function resolveTone(tone?: BadgeTone, variant?: LegacyBadgeVariant): BadgeTone {
  if (tone) return tone;
  switch (variant) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'danger':
      return 'danger';
    case 'gold':
      return 'warning';
    case 'outline':
    case 'secondary':
    case 'default':
    default:
      return 'neutral';
  }
}

export function Badge({ className, tone, variant, ...props }: BadgeProps) {
  const resolved = resolveTone(tone, variant);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        toneStyles[resolved],
        className,
      )}
      {...props}
    />
  );
}

export type { BadgeProps };
