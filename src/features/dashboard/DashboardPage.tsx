import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
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
import { getFirstAccessiblePath } from '@/lib/navigation-access';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageLoader } from '@/components/common/loading-state';
import { fieldControlClass } from '@/components/ui/form-fields';
import { BarChart, DonutChart, LoadingOverlay, type ChartDatum } from '@/features/dashboard/components/charts';
import { BookingCalendar } from '@/features/dashboard/components/booking-calendar';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  pending: '#8a7a68',
  confirmed: '#4b3621',
  checkedIn: '#6e5640',
  checkedOut: '#c9a227',
  cancelled: '#b91c1c',
  active: '#a67c52',
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
  const canReadDashboard = hasPermission(session?.perms, 'dashboard', 'read');
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
    if (!canReadDashboard) {
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
  }, [appliedRange, canReadDashboard]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Trimmed to the KPIs that matter most — brand / gold / muted only.
  const kpiCards = useMemo(
    () => stats ? [
      {
        label: 'Revenue (range)',
        value: formatCurrency(stats.rangeRevenue),
        icon: CircleDollarSign,
        value_class: 'text-brand',
        icon_class: 'bg-brand text-brand-foreground',
      },
      {
        label: 'Bookings (range)',
        value: String(stats.rangeBookings),
        icon: CalendarRange,
        value_class: 'text-foreground',
        icon_class: 'bg-muted text-brand',
      },
      {
        label: 'Completion ratio',
        value: `${stats.completionRatio.toFixed(1)}%`,
        icon: TrendingUp,
        value_class: 'text-brand',
        icon_class: 'bg-muted text-brand',
      },
      {
        label: 'Cancellation ratio',
        value: `${stats.cancellationRatio.toFixed(1)}%`,
        icon: TrendingDown,
        value_class: 'text-destructive',
        icon_class: 'bg-danger-50 text-destructive',
      },
      {
        label: 'Total rooms',
        value: String(stats.totalRooms),
        icon: BedDouble,
        value_class: 'text-foreground',
        icon_class: 'bg-gold-muted text-brand',
      },
      {
        label: 'Backoffice users',
        value: String(stats.totalBackofficeUsers),
        icon: Users,
        value_class: 'text-foreground',
        icon_class: 'bg-muted text-muted-foreground',
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

  if (!canReadDashboard && !canReadBookings) {
    return <Navigate to={getFirstAccessiblePath(session?.perms)} replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              {canReadDashboard
                ? 'KPIs, booking trends, and stay calendar in one place.'
                : 'Booking calendar for your accessible date range.'}
            </CardDescription>
          </div>
          {canReadDashboard ? (
            <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
              <div className="flex w-max min-w-full flex-nowrap items-end gap-3">
                <label className="space-y-1.5 text-sm font-medium text-foreground">
                  <span>From</span>
                  <input
                    type="datetime-local"
                    value={fromInput}
                    max={toInput}
                    onChange={(event) => setFromInput(event.target.value)}
                    className={cn(fieldControlClass, 'w-[210px] [color-scheme:light] dark:[color-scheme:dark]')}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-foreground">
                  <span>To</span>
                  <input
                    type="datetime-local"
                    value={toInput}
                    min={fromInput}
                    onChange={(event) => setToInput(event.target.value)}
                    className={cn(fieldControlClass, 'w-[210px] [color-scheme:light] dark:[color-scheme:dark]')}
                  />
                </label>
                <Button
                  className="shrink-0"
                  onClick={() => setAppliedRange({ from: fromInput, to: toInput })}
                  disabled={statsLoading}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  className="shrink-0"
                  disabled={statsLoading}
                  onClick={() => {
                    setFromInput(defaultFrom);
                    setToInput(defaultTo);
                    setAppliedRange({ from: defaultFrom, to: defaultTo });
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-6">
          {canReadDashboard ? (
            <>
              {statsError ? (
                <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-destructive">
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
                        <div
                          key={item.label}
                          className="rounded-xl border border-border bg-card p-5 transition-shadow duration-200 hover:shadow-md"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {item.label}
                              </p>
                              <div className={cn('rounded-lg p-2', item.icon_class)}>
                                <Icon className="h-4 w-4" />
                              </div>
                            </div>
                            <p className={cn('text-2xl font-bold tracking-tight', item.value_class)}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-5">
                      <div className="mb-4">
                        <h2 className="text-base font-semibold text-foreground">Bookings by status</h2>
                        <p className="text-sm text-muted-foreground">Selected range comparison.</p>
                      </div>
                      <BarChart data={statusBars} />
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5">
                      <div className="mb-4">
                        <h2 className="text-base font-semibold text-foreground">Outcome split</h2>
                        <p className="text-sm text-muted-foreground">Completed vs cancelled vs in-progress.</p>
                      </div>
                      <DonutChart
                        data={outcomeSegments}
                        centerValue={`${(stats?.completionRatio ?? 0).toFixed(0)}%`}
                        centerLabel="completed"
                      />
                    </div>
                  </section>
                </div>
              )}
            </>
          ) : null}

          {canReadBookings ? <BookingCalendar canRead /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
