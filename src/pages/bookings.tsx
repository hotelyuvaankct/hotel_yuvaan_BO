import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, CalendarPlus, Eye, RefreshCw, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import type { Booking, HotelSummary } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingListStatusFilters, bookingStatusOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { Pagination } from '@/components/common/pagination';
import { SelectField, TextField } from '@/components/ui/form-fields';

const emptyFilters = { hotelId: '', bookingStatus: '', search: '' };

function statusVariant(status?: number): 'gold' | 'success' | 'danger' | 'warning' | 'secondary' {
  // Booked / active stay
  if (status === 3 || status === 4) return 'gold';
  // Completed
  if (status === 5) return 'success';
  // Cancelled
  if (status === 6) return 'danger';
  // Pending / hold
  if (status === 1 || status === 2) return 'warning';
  return 'secondary';
}

function statusLabel(status?: number) {
  if (status === 3 || status === 4) return 'Booked';
  if (status === 5) return 'Completed';
  if (status === 6) return 'Cancelled';
  return optionLabel(bookingStatusOptions, status);
}

function formatCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function BookingCard({
  booking,
  canUpdate,
}: {
  booking: Booking;
  canUpdate: boolean;
}) {
  const showUpdate = canUpdate && booking.bookingStatus !== 6 && booking.bookingStatus !== 5;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/70 bg-background p-4 shadow-[0_4px_16px_rgb(0,0,0,0.03)] transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">{booking.bookingCode}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{booking.hotelName || '-'}</span>
          </p>
        </div>
        <Badge variant={statusVariant(booking.bookingStatus)} className="shrink-0">
          {statusLabel(booking.bookingStatus)}
        </Badge>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="font-medium">{booking.guestName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {booking.guestPhone || booking.guestEmail || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-muted-foreground">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>
              <span className="text-foreground">{formatDate(booking.checkIn)}</span>
              <span className="mx-1.5">→</span>
              <span className="text-foreground">{formatDate(booking.checkOut)}</span>
            </p>
            <p className="text-xs">Check-in to check-out</p>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <p className="text-base font-semibold">{formatCurrency(booking.totalAmount)}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => undefined}>
            <Link to={`/bookings/${booking.id}`} className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          {showUpdate ? (
            <Button variant="outline" size="sm" onClick={() => undefined}>
              <Link to={`/bookings/${booking.id}/edit`} className="inline-flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" />
                Update
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function BookingsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'bookings', 'read');
  const canUpdate = hasPermission(session?.perms, 'bookings', 'update');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);

  async function load(targetPage = page, activeFilters = filters) {
    setLoading(true);
    try {
      const result = await api.listBookings({
        page: targetPage,
        size: 10,
        hotelId: activeFilters.hotelId ? Number(activeFilters.hotelId) : undefined,
        bookingStatus: activeFilters.bookingStatus ? Number(activeFilters.bookingStatus) : undefined,
        guestName: activeFilters.search,
      });
      setBookings(result.content ?? []);
      setPage(result.number ?? targetPage);
      setTotalPages(result.totalPages ?? 0);
      setTotalElements(result.totalElements ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load bookings.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    void api.listHotels()
      .then((hotelList) => setHotels(hotelList ?? []))
      .catch(() => undefined);
  }, [canRead]);

  useEffect(() => {
    if (!canRead) return;
    const timeout = window.setTimeout(() => {
      setPage(0);
      void load(0, filters);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [canRead, filters.hotelId, filters.bookingStatus, filters.search]);

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your current role does not include read access for bookings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>{totalElements} booking{totalElements === 1 ? '' : 's'} found.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[220px_220px_1fr_auto]">
            <SelectField
              variant="filter"
              value={filters.hotelId}
              placeholder="All hotels"
              options={hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))}
              onChange={(event) => setFilters((current) => ({ ...current, hotelId: event.target.value }))}
            />
            <SelectField
              variant="filter"
              value={filters.bookingStatus}
              placeholder="All statuses"
              options={bookingListStatusFilters.map((option) => ({ value: option.value, label: option.label }))}
              onChange={(event) => setFilters((current) => ({ ...current, bookingStatus: event.target.value }))}
            />
            <TextField
              placeholder="Search guest or booking ID"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              onClick={() => setFilters(emptyFilters)}
            >
              Clear
            </Button>
          </div>

          {loading ? <LoadingState /> : null}

          {!loading && bookings.length === 0 ? <EmptyState /> : null}

          {!loading && bookings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} canUpdate={canUpdate} />
              ))}
            </div>
          ) : null}

          <Pagination
            page={page}
            totalPages={totalPages}
            loading={loading}
            onPageChange={(p) => void load(p)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
