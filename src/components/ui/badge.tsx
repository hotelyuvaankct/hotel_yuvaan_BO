import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'gold' | 'success' | 'warning' | 'danger';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-foreground text-background',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border bg-background text-foreground',
  gold: 'bg-gold-muted text-brand dark:bg-gold/15 dark:text-gold-border',
  success: 'bg-success/15 text-success dark:bg-success/20 dark:text-success-foreground',
  warning: 'bg-warning/15 text-brand dark:bg-warning/20 dark:text-warning',
  danger: 'bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-destructive-foreground',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}