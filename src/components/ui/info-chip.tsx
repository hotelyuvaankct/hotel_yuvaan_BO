import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type InfoChipProps = {
  icon?: LucideIcon;
  label: string;
  href?: string;
  className?: string;
};

/** Pill chip for contact / meta (email, phone, guests count). */
export function InfoChip({ icon: Icon, label, href, className }: InfoChipProps) {
  const content = (
    <>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
      <span className="truncate">{label}</span>
    </>
  );

  const classes = cn(
    'inline-flex min-w-0 max-w-full items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-sm text-foreground transition-colors',
    href && 'hover:bg-muted',
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return <span className={classes}>{content}</span>;
}

export type { InfoChipProps };
