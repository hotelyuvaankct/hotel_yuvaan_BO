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

/** Horizontal bar chart for comparing category magnitudes. */
export function BarChart({ data, valueFormatter }: { data: ChartDatum[]; valueFormatter?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const format = valueFormatter ?? niceNumber;
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this range.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((d) => (
        <div key={d.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: `${d.color}1f`, color: d.color }}
            >
              {format(d.value)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
            />
          </div>
        </div>
      ))}
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
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
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
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted/60"
            >
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.label}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="font-semibold">{format(d.value)}</span>
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
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/60 backdrop-blur-[1px] transition-opacity duration-200',
        show ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!show}
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
        <svg className="h-3.5 w-3.5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        {label}
      </span>
    </div>
  );
}
