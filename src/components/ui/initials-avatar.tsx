import { cn } from '@/lib/utils';
import { guestInitials } from '@/lib/format';

type InitialsAvatarProps = {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'danger' | 'muted';
  className?: string;
  fallback?: string;
};

const sizeClass = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-12 w-12 text-sm',
} as const;

const toneClass = {
  brand: 'bg-brand text-brand-foreground',
  danger: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
} as const;

/** Circular initials avatar for guests / users in lists and detail heroes. */
export function InitialsAvatar({
  name,
  size = 'md',
  tone = 'brand',
  className,
  fallback = 'G',
}: InitialsAvatarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizeClass[size],
        toneClass[tone],
        className,
      )}
      aria-hidden
    >
      {guestInitials(name, fallback)}
    </div>
  );
}

export type { InitialsAvatarProps };
