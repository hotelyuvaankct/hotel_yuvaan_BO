import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  CalendarRange,
  CircleDollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageLoader } from '@/components/common/loading-state';
import { fieldControlClass } from '@/components/ui/form-fields';
import { BarChart, DonutChart, LoadingOverlay, type ChartDatum } from '@/components/dashboard/charts';
import { BookingCalendar } from '@/components/dashboard/booking-calendar';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  checkedIn: '#0ea5e9',
  checkedOut: '#8b5cf6',
  cancelled: '#f43f5e',
  active: '#0ea5e9',
} as const;

function formatCurrency(value?: number) {
  if (value == null) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateTimeLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function DashboardPage() {
  const { session } = useAuth();
  const canReadBookings = hasPermission(session?.perms, 'bookings', 'read');

  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => toDateTimeLocal(startOfMonth(now)), [now]);
  const defaultTo = useMemo(() => toDateTimeLocal(now), [now]);

  const [fromInput, setFromInput] = useState(defaultFrom);
  const [toInput, setToInput] = useState(defaultTo);
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string }>({
    from: defaultFrom,
    to: defaultTo,
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!canReadBookings) {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    setStatsError('');
    try {
      const fromIso = appliedRange.from ? new Date(appliedRange.from).toISOString() : undefined;
      const toIso = appliedRange.to ? new Date(appliedRange.to).toISOString() : undefined;
      setStats(await api.getDashboardStats({ from: fromIso, to: toIso }));
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Unable to load KPI data.');
    } finally {
      setStatsLoading(false);
    }
  }, [appliedRange, canReadBookings]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Trimmed to the KPIs that matter most.
  const kpiCards = useMemo(
    () => stats ? [
      {
        label: 'Revenue (range)',
        value: formatCurrency(stats.rangeRevenue),
        icon: CircleDollarSign,
        value_class: 'text-emerald-600 dark:text-emerald-400',
        icon_class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        glow: 'from-emerald-500/10',
      },
      {
        label: 'Bookings (range)',
        value: String(stats.rangeBookings),
        icon: CalendarRange,
        value_class: 'text-sky-600 dark:text-sky-400',
        icon_class: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
        glow: 'from-sky-500/10',
      },
      {
        label: 'Completion ratio',
        value: `${stats.completionRatio.toFixed(1)}%`,
        icon: TrendingUp,
        value_class: 'text-emerald-600 dark:text-emerald-400',
        icon_class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        glow: 'from-emerald-500/10',
      },
      {
        label: 'Cancellation ratio',
        value: `${stats.cancellationRatio.toFixed(1)}%`,
        icon: TrendingDown,
        value_class: 'text-rose-600 dark:text-rose-400',
        icon_class: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
        glow: 'from-rose-500/10',
      },
      {
        label: 'Total rooms',
        value: String(stats.totalRooms),
        icon: BedDouble,
        value_class: 'text-gold-700 dark:text-gold-300',
        icon_class: 'bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-200',
        glow: 'from-gold-500/10',
      },
      {
        label: 'Backoffice users',
        value: String(stats.totalBackofficeUsers),
        icon: Users,
        value_class: 'text-violet-600 dark:text-violet-400',
        icon_class: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
        glow: 'from-violet-500/10',
      },
    ] : [],
    [stats],
  );

  const statusBars: ChartDatum[] = useMemo(
    () => stats ? [
      { label: 'Pending', value: stats.pendingBookings, color: STATUS_COLORS.pending },
      { label: 'Confirmed', value: stats.confirmedBookings, color: STATUS_COLORS.confirmed },
      { label: 'Checked in', value: stats.checkedInBookings, color: STATUS_COLORS.checkedIn },
      { label: 'Checked out', value: stats.checkedOutBookings, color: STATUS_COLORS.checkedOut },
      { label: 'Cancelled', value: stats.cancelledBookings, color: STATUS_COLORS.cancelled },
    ] : [],
    [stats],
  );

  const outcomeSegments: ChartDatum[] = useMemo(() => {
    if (!stats) return [];
    const active = Math.max(
      0,
      stats.rangeBookings - stats.checkedOutBookings - stats.cancelledBookings,
    );
    return [
      { label: 'Completed', value: stats.checkedOutBookings, color: STATUS_COLORS.checkedOut },
      { label: 'Cancelled', value: stats.cancelledBookings, color: STATUS_COLORS.cancelled },
      { label: 'In progress', value: active, color: STATUS_COLORS.active },
    ];
  }, [stats]);

  if (!canReadBookings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Booking read permission is required to view dashboard statistics.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* KPI date filter */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-4">
          <div>
            <CardTitle>Key performance indicators</CardTitle>
            <CardDescription>Filter KPIs by booking creation date &amp; time.</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>From</span>
              <input
                type="datetime-local"
                value={fromInput}
                max={toInput}
                onChange={(event) => setFromInput(event.target.value)}
                className={cn(fieldControlClass, 'w-[210px] [color-scheme:light] dark:[color-scheme:dark]')}
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>To</span>
              <input
                type="datetime-local"
                value={toInput}
                min={fromInput}
                onChange={(event) => setToInput(event.target.value)}
                className={cn(fieldControlClass, 'w-[210px] [color-scheme:light] dark:[color-scheme:dark]')}
              />
            </label>
            <Button onClick={() => setAppliedRange({ from: fromInput, to: toInput })} disabled={statsLoading}>
              Apply
            </Button>
            <Button
              variant="outline"
              disabled={statsLoading}
              onClick={() => {
                setFromInput(defaultFrom);
                setToInput(defaultTo);
                setAppliedRange({ from: defaultFrom, to: defaultTo });
              }}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Reset
            </Button>
          </div>
        </CardHeader>
      </Card>

      {statsError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {statsError}
        </div>
      ) : null}

      {statsLoading && !stats ? (
        <FullPageLoader label="Loading KPIs..." />
      ) : (
        <div className="relative space-y-6">
          <LoadingOverlay show={statsLoading} />

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpiCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.label}
                  className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgb(0,0,0,0.08)]"
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100',
                      item.glow,
                    )}
                  />
                  <CardContent className="relative flex flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <div className={cn('rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110', item.icon_class)}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={cn('text-2xl font-bold tracking-tight', item.value_class)}>{item.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* Comparison graphs */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bookings by status</CardTitle>
                <CardDescription>Selected range comparison.</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart data={statusBars} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outcome split</CardTitle>
                <CardDescription>Completed vs cancelled vs in-progress.</CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={outcomeSegments}
                  centerValue={`${(stats?.completionRatio ?? 0).toFixed(0)}%`}
                  centerLabel="completed"
                />
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {/* Booking calendar */}
      <BookingCalendar canRead={canReadBookings} />
    </div>
  );
}
