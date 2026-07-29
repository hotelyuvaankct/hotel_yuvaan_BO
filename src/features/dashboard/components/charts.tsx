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

/** Vertical column chart — brand-friendly comparison graph. */
export function BarChart({ data, valueFormatter }: { data: ChartDatum[]; valueFormatter?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const format = valueFormatter ?? niceNumber;
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this range.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-48 items-end gap-2 border-b border-border pb-0 sm:gap-3">
        {data.map((d) => {
          const height = Math.max((d.value / max) * 100, d.value > 0 ? 6 : 0);
          return (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[11px] font-semibold tabular-nums text-foreground">{format(d.value)}</span>
              <div className="flex h-36 w-full items-end justify-center">
                <div
                  className="w-full max-w-[48px] rounded-t-md transition-[height] duration-700 ease-out"
                  style={{ height: `${height}%`, backgroundColor: d.color }}
                  title={`${d.label}: ${format(d.value)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 sm:gap-3">
        {data.map((d) => (
          <div key={d.label} className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{d.label}</p>
          </div>
        ))}
      </div>
    </div>
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
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-around">
      <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
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

      <ul className="w-full space-y-1.5 sm:max-w-[200px]">
        {data.map((d) => {
          const fraction = total > 0 ? d.value / total : 0;
          return (
            <li
              key={d.label}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs"
            >
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="font-medium text-foreground">{d.label}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
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
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
        <svg className="h-3.5 w-3.5 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        {label}
      </span>
    </div>
  );
}
