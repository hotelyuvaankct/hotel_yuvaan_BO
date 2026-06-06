import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingState({ label = 'Loading data...', className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn('flex min-h-40 w-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}

export function FullPageLoader({ label = 'Loading page...' }: { label?: string }) {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] w-full items-center justify-center">
      <LoadingState label={label} className="min-h-0" />
    </div>
  );
}
