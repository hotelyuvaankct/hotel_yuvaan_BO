import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusTimelineStep = {
  key: string;
  label: string;
  /** Primary line under the label (e.g. date) */
  date?: string;
  /** Secondary line (e.g. time) */
  time?: string;
  /** Single-line caption when date/time split is not needed */
  caption?: string;
};

type StatusTimelineProps = {
  steps: StatusTimelineStep[];
  emptyLabel?: string;
  className?: string;
};

/**
 * Payment / lifecycle stepper.
 * Mobile: vertical rail. Desktop (`sm+`): horizontal connected steps.
 */
export function StatusTimeline({
  steps,
  emptyLabel = 'No timestamps recorded.',
  className,
}: StatusTimelineProps) {
  if (steps.length === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>{emptyLabel}</p>;
  }

  return (
    <div className={cn(className)}>
      <ol className="space-y-0 sm:hidden">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step.key} className="relative flex gap-3">
              <div className="flex w-7 shrink-0 flex-col items-center">
                <StepMarker index={index} isLast={isLast} />
                {!isLast ? <span className="w-0.5 flex-1 bg-border" aria-hidden /> : null}
              </div>
              <div className={cn('min-w-0 flex-1 pb-5', isLast && 'pb-0')}>
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <StepCaption step={step} />
              </div>
            </li>
          );
        })}
      </ol>

      <ol className="hidden items-start sm:flex">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.key}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center"
            >
              {!isLast ? (
                <span
                  className="absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-3.5 h-0.5 bg-border"
                  aria-hidden
                />
              ) : null}
              <StepMarker index={index} isLast={isLast} />
              <p className="mt-2.5 text-xs font-semibold text-foreground">{step.label}</p>
              <StepCaption step={step} align="center" />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepMarker({ index, isLast }: { index: number; isLast: boolean }) {
  return (
    <span
      className={cn(
        'relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2',
        isLast
          ? 'border-foreground bg-foreground text-background shadow-sm'
          : 'border-success/40 bg-success/10 text-success',
      )}
    >
      {isLast ? (
        <span className="text-[10px] font-bold">{index + 1}</span>
      ) : (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      )}
    </span>
  );
}

function StepCaption({
  step,
  align = 'start',
}: {
  step: StatusTimelineStep;
  align?: 'start' | 'center';
}) {
  const alignClass = align === 'center' ? 'text-center' : '';
  if (step.caption) {
    return (
      <p className={cn('mt-0.5 text-xs tabular-nums text-muted-foreground', alignClass)}>
        {step.caption}
      </p>
    );
  }
  return (
    <>
      {step.date ? (
        <p className={cn('mt-0.5 text-[11px] tabular-nums text-muted-foreground', alignClass)}>
          {step.date}
          {step.time && align === 'start' ? ` · ${step.time}` : null}
        </p>
      ) : null}
      {step.time && align === 'center' ? (
        <p className="text-[11px] tabular-nums text-muted-foreground">{step.time}</p>
      ) : null}
    </>
  );
}

export type { StatusTimelineProps };
