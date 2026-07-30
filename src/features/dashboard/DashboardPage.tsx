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
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageLoader } from '@/components/common/loading-state';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { BarChart, DonutChart, LoadingOverlay, type ChartDatum } from '@/features/dashboard/components/charts';
import { BookingCalendar } from '@/features/dashboard/components/booking-calendar';
import { parseIsoDate, todayIso } from '@/lib/form-validation';
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

function startOfMonthIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/** Local calendar day → start/end of day as ISO for the API. */
function dateToStartIso(value: string) {
  const date = parseIsoDate(value);
  if (!date) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).toISOString();
}

function dateToEndIso(value: string) {
  const date = parseIsoDate(value);
  if (!date) return undefined;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString();
}

export function DashboardPage() {
  const { session } = useAuth();
  const canReadDashboard = hasPermission(session?.perms, 'dashboard', 'read');
  const canReadBookings = hasPermission(session?.perms, 'bookings', 'read');

  const defaultFrom = useMemo(() => startOfMonthIso(), []);
  const defaultTo = useMemo(() => todayIso(), []);

  const [range, setRange] = useState<{ from: string; to: string }>({
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
      setStats(
        await api.getDashboardStats({
          from: dateToStartIso(range.from),
          to: dateToEndIso(range.to),
        }),
      );
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Unable to load KPI data.');
    } finally {
      setStatsLoading(false);
    }
  }, [range, canReadDashboard]);

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
    <div className="min-w-0 space-y-6 animate-fade-in-up">
      <Card className="min-w-0 overflow-hidden">
        <div className="space-y-3 border-b border-border px-4 py-4 sm:space-y-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>
                {canReadDashboard ? (
                  <>
                    KPIs, booking trends,
                    <span className="hidden sm:inline"> and stay calendar in one place.</span>
                  </>
                ) : (
                  'Booking calendar for your accessible date range.'
                )}
              </CardDescription>
            </div>
            {canReadDashboard ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 shrink-0 px-0 sm:w-auto sm:px-3"
                aria-label="Reset"
                disabled={statsLoading}
                onClick={() => setRange({ from: defaultFrom, to: defaultTo })}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            ) : null}
          </div>
          {canReadDashboard ? (
            <DateRangePicker
              variant="filter"
              label="Date range"
              allowSameDay
              wrapperClassName="min-w-0 w-full sm:max-w-sm"
              startValue={range.from}
              endValue={range.to}
              maxDate={todayIso()}
              onChange={(start, end) => setRange({ from: start, to: end })}
            />
          ) : null}
        </div>

        <CardContent className="min-w-0 space-y-6 overflow-hidden px-4 sm:px-5">
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

                  <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {kpiCards.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-3 transition-shadow duration-200 hover:shadow-md sm:p-4 lg:p-5"
                        >
                          <div className="flex min-w-0 flex-col gap-2 lg:gap-3">
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 break-words text-[10px] font-medium uppercase leading-snug tracking-wide text-muted-foreground sm:text-xs">
                                {item.label}
                              </p>
                              <div className={cn('shrink-0 rounded-lg p-1.5 lg:p-2', item.icon_class)}>
                                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </div>
                            </div>
                            <p className={cn('truncate text-lg font-bold tracking-tight sm:text-xl lg:text-2xl', item.value_class)}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </section>

                  <section className="grid min-w-0 gap-4 lg:grid-cols-2">
                    <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
                      <div className="mb-4">
                        <h2 className="text-base font-semibold text-foreground">Bookings by status</h2>
                        <p className="text-sm text-muted-foreground">Selected range comparison.</p>
                      </div>
                      <BarChart data={statusBars} />
                    </div>

                    <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
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
