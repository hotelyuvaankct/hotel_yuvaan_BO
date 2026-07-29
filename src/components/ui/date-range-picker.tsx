import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { filterControlClass, fieldControlClass } from '@/components/ui/form-fields';
import { addDaysIso, parseIsoDate, todayIso } from '@/lib/form-validation';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DEFAULT_MAX_DAYS = 180;

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(value: string) {
  const date = parseIsoDate(value) ?? new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);
}

function formatRangeLabel(start: string, end: string) {
  if (!start && !end) return 'Select dates';
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (startDate && endDate) {
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  }
  if (startDate) return `${formatter.format(startDate)} - …`;
  return 'Select dates';
}

function daysBetween(start: string, end: string) {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function buildMonthCells(monthStart: Date) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ iso: string; day: number } | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      iso: toLocalIsoDate(new Date(year, month, day)),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function controlClass(error?: string, className?: string, base = fieldControlClass) {
  return cn(
    base,
    error ? 'border-destructive focus:ring-destructive/30' : 'border-input hover:border-ring/40',
    className,
  );
}

type DateRangePickerProps = {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  wrapperClassName?: string;
  variant?: 'field' | 'filter';
  align?: 'start' | 'end';
  startValue: string;
  endValue: string;
  minDate?: string;
  maxDate?: string;
  maxDays?: number;
  onChange: (start: string, end: string) => void;
};

export function DateRangePicker({
  label,
  error,
  hint,
  required,
  wrapperClassName,
  variant = 'field',
  align = 'start',
  startValue,
  endValue,
  minDate,
  maxDate,
  maxDays = DEFAULT_MAX_DAYS,
  onChange,
}: DateRangePickerProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startValue);
  const [draftEnd, setDraftEnd] = useState(endValue);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(startValue || todayIso()));

  const base = variant === 'filter' ? filterControlClass : fieldControlClass;
  const rangeEnd =
    pickingEnd && draftStart && hoverDate && hoverDate > draftStart ? hoverDate : draftEnd;
  const display = open
    ? formatRangeLabel(draftStart, rangeEnd)
    : formatRangeLabel(startValue, endValue);
  const canApply = Boolean(
    draftStart &&
      draftEnd &&
      draftEnd > draftStart &&
      (!minDate || draftStart >= minDate) &&
      (!maxDate || draftEnd <= maxDate),
  );

  useEffect(() => {
    if (!open) return;
    setDraftStart(startValue);
    setDraftEnd(endValue);
    setPickingEnd(false);
    setHoverDate(null);
    setViewMonth(startOfMonth(startValue || todayIso()));
  }, [open, startValue, endValue]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function selectDay(iso: string) {
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;

    if (!pickingEnd || !draftStart) {
      setDraftStart(iso);
      setDraftEnd('');
      setPickingEnd(true);
      setHoverDate(null);
      return;
    }

    if (iso === draftStart) {
      setDraftEnd(addDaysIso(iso, 1));
      setPickingEnd(false);
      setHoverDate(null);
      return;
    }

    if (iso < draftStart) {
      setDraftStart(iso);
      setDraftEnd('');
      setPickingEnd(true);
      setHoverDate(null);
      return;
    }

    if (daysBetween(draftStart, iso) > maxDays) return;

    setDraftEnd(iso);
    setPickingEnd(false);
    setHoverDate(null);
  }

  function apply() {
    if (!canApply) return;
    onChange(draftStart, draftEnd);
    setOpen(false);
  }

  const leftMonth = viewMonth;
  const rightMonth = addMonths(viewMonth, 1);

  return (
    <div className={cn('block space-y-2 text-sm font-medium', wrapperClassName)}>
      {label ? (
        <span>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
      ) : null}

      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            controlClass(error, 'relative flex w-full items-center justify-between gap-2 text-left', base),
            open && 'border-primary ring-2 ring-ring/60',
          )}
        >
          <span className={cn('truncate', !(open ? draftStart : startValue) ? 'text-muted-foreground' : '')}>
            {display}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {open ? (
          <div
            id={panelId}
            role="dialog"
            aria-label="Select stay dates"
            className={cn(
              'absolute top-[calc(100%+8px)] z-50 w-[min(100vw-1.5rem,560px)] rounded-2xl border border-border bg-background p-3 shadow-xl sm:p-4',
              align === 'end' ? 'right-0' : 'left-0',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Previous month"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                onClick={() => setViewMonth((current) => addMonths(current, -1))}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <p className="truncate text-center text-sm font-semibold">{monthLabel(leftMonth)}</p>
                <p className="hidden truncate text-center text-sm font-semibold sm:block">{monthLabel(rightMonth)}</p>
              </div>
              <button
                type="button"
                aria-label="Next month"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                onClick={() => setViewMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MonthGrid
                monthStart={leftMonth}
                draftStart={draftStart}
                draftEnd={rangeEnd}
                minDate={minDate}
                maxDate={maxDate}
                maxDays={maxDays}
                onSelect={selectDay}
                onHover={setHoverDate}
              />
              <MonthGrid
                className="hidden sm:block"
                monthStart={rightMonth}
                draftStart={draftStart}
                draftEnd={rangeEnd}
                minDate={minDate}
                maxDate={maxDate}
                maxDays={maxDays}
                onSelect={selectDay}
                onHover={setHoverDate}
              />
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-normal text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>You may select one continuous period of up to {maxDays} days.</span>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="h-9 min-w-[88px]" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" className="h-9 min-w-[88px]" disabled={!canApply} onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <span className="block text-xs font-normal text-destructive">{error}</span> : null}
      {!error && hint ? <span className="block text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

type MonthGridProps = {
  monthStart: Date;
  draftStart: string;
  draftEnd: string;
  minDate?: string;
  maxDate?: string;
  maxDays: number;
  className?: string;
  onSelect: (iso: string) => void;
  onHover: (iso: string | null) => void;
};

function MonthGrid({
  monthStart,
  draftStart,
  draftEnd,
  minDate,
  maxDate,
  maxDays,
  className,
  onSelect,
  onHover,
}: MonthGridProps) {
  const cells = buildMonthCells(monthStart);
  const hasRange = Boolean(draftStart && draftEnd && draftEnd > draftStart);

  return (
    <div className={className}>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} className="h-9" />;
          }

          const isStart = cell.iso === draftStart;
          const isEnd = hasRange && cell.iso === draftEnd;
          const inRange = hasRange && cell.iso > draftStart && cell.iso < draftEnd;
          const inSelection = isStart || isEnd || inRange;
          const beforeMin = Boolean(minDate && cell.iso < minDate);
          const afterMax = Boolean(maxDate && cell.iso > maxDate);
          const beyondMax =
            Boolean(draftStart && !draftEnd) &&
            cell.iso > draftStart &&
            daysBetween(draftStart, cell.iso) > maxDays;
          const disabled = beforeMin || afterMax || beyondMax;

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onMouseEnter={() => onHover(cell.iso)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(cell.iso)}
              className={cn(
                'relative flex h-9 items-center justify-center text-sm transition-colors',
                disabled && 'cursor-not-allowed text-muted-foreground/40',
              )}
            >
              {hasRange && inSelection ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-y-1 bg-primary/15',
                    inRange && 'inset-x-0',
                    isStart && !isEnd && 'left-1/2 right-0',
                    isEnd && !isStart && 'left-0 right-1/2',
                    isStart && isEnd && 'hidden',
                  )}
                />
              ) : null}
              <span
                className={cn(
                  'relative z-[1] flex h-8 w-8 items-center justify-center rounded-full',
                  !disabled && !isStart && !isEnd && !inRange && 'hover:bg-muted',
                  (isStart || isEnd) && 'bg-primary font-semibold text-primary-foreground',
                  inRange && 'text-foreground',
                )}
              >
                {cell.day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
