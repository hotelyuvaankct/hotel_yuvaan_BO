import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type ChartDatum = {
  label: string;
  value: number;
  color: string;
};

function niceNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

/** Horizontal bar comparison — readable labels on every viewport. */
export function BarChart({ data, valueFormatter }: { data: ChartDatum[]; valueFormatter?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const format = valueFormatter ?? niceNumber;
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this range.</p>;
  }

  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const width = Math.max((d.value / max) * 100, d.value > 0 ? 6 : 0);
        return (
          <li key={d.label} className="min-w-0 space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 font-medium text-foreground">{d.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{format(d.value)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${width}%`, backgroundColor: d.color }}
                title={`${d.label}: ${format(d.value)}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Donut chart with a centered headline for composition / share. */
export function DonutChart({
  data,
  centerValue,
  centerLabel,
  valueFormatter,
}: {
  data: ChartDatum[];
  centerValue: string;
  centerLabel: string;
  valueFormatter?: (n: number) => string;
}) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const format = valueFormatter ?? niceNumber;

  const radius = 60;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;

  let offsetAccum = 0;
  const segments = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dash = fraction * circumference;
    const segment = {
      ...d,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offsetAccum,
      fraction,
    };
    offsetAccum += dash;
    return segment;
  });

  return (
    <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-around">
      <svg viewBox="0 0 160 160" className="h-40 w-40 max-w-full shrink-0 -rotate-90 sm:h-44 sm:w-44">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth={stroke} />
        {total > 0
          ? segments.map((s) => (
              <circle
                key={s.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={s.dashArray}
                strokeDashoffset={s.dashOffset}
                strokeLinecap="butt"
              />
            ))
          : null}
        <g className="rotate-90" style={{ transformOrigin: '80px 80px' }}>
          <text x="80" y="74" textAnchor="middle" className="fill-foreground text-[22px] font-bold">
            {centerValue}
          </text>
          <text x="80" y="94" textAnchor="middle" className="fill-muted-foreground text-[9px]">
            {centerLabel}
          </text>
        </g>
      </svg>

      <ul className="w-full min-w-0 space-y-1.5 sm:max-w-[220px]">
        {data.map((d) => {
          const fraction = total > 0 ? d.value / total : 0;
          return (
            <li
              key={d.label}
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="truncate font-medium text-foreground">{d.label}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-1.5">
                <span className="font-semibold tabular-nums text-foreground">{format(d.value)}</span>
                <span className="text-[10px] text-muted-foreground">{(fraction * 100).toFixed(0)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Small absolute overlay shown over a section while a refetch is in flight. */
export function LoadingOverlay({ show, label = 'Updating...' }: { show: boolean; label?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/70 transition-opacity duration-200',
        show ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!show}
    >
      {show ? (
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
          {label}
        </span>
      ) : null}
    </div>
  );
}
