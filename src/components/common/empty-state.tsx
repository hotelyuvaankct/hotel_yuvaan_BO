import { cn } from '@/lib/utils';

export function EmptyState({ label = 'No data available.', className }: { label?: string; className?: string }) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{label}</p>;
}
