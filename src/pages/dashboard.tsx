import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, CalendarRange, CircleDollarSign, DoorOpen, LogIn, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingStatusOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';

function formatCurrency(value?: number) {
  if (value == null) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function DashboardPage() {
  const { session } = useAuth();
  const canReadBookings = hasPermission(session?.perms, 'bookings', 'read');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!canReadBookings) {
        setLoading(false);
        return;
      }
      try {
        setStats(await api.getDashboardStats());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [canReadBookings]);

  const cards = useMemo(
    () => stats ? [
      { label: 'Total bookings', value: String(stats.totalBookings), icon: CalendarRange },
      { label: 'Pending', value: String(stats.pendingBookings), icon: CalendarRange },
      { label: 'Confirmed', value: String(stats.confirmedBookings), icon: CalendarRange },
      { label: 'Checked in', value: String(stats.checkedInBookings), icon: DoorOpen },
      { label: 'Today check-ins', value: String(stats.todayCheckIns), icon: LogIn },
      { label: 'Today check-outs', value: String(stats.todayCheckOuts), icon: LogOut },
      { label: 'Total rooms', value: String(stats.totalRooms), icon: BedDouble },
      { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: CircleDollarSign },
    ] : [],
    [stats],
  );

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

  if (loading) {
    return <FullPageLoader label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                </div>
                <div className="rounded-xl bg-gold-100 p-3 text-gold-700 dark:bg-gold-500/15 dark:text-gold-100">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Recent bookings</CardTitle>
            <CardDescription>Latest reservations from the booking API.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => undefined}>
            <Link to="/bookings">View all bookings</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(stats?.recentBookings ?? []).length === 0 ? <EmptyState /> : null}
          {(stats?.recentBookings ?? []).map((booking) => (
            <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-3">
              <div>
                <p className="font-semibold">{booking.bookingCode} · {booking.guestName}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.hotelName} · {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="gold">{optionLabel(bookingStatusOptions, booking.bookingStatus)}</Badge>
                <span className="font-medium">{formatCurrency(booking.totalAmount)}</span>
                <Link to={`/bookings/${booking.id}`} className="font-semibold text-gold-700 hover:underline dark:text-gold-200">
                  View
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
