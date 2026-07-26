import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, CalendarPlus, Eye, LogOut, RefreshCw, UserRound, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Booking } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingStatusOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { Pagination } from '@/components/common/pagination';
import { TextField } from '@/components/ui/form-fields';

const DEFAULT_STATUSES = [3, 4]; // Confirmed + Checked in
const emptyFilters = { bookingStatuses: DEFAULT_STATUSES as number[], search: '' };

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
  onCheckedOut,
}: {
  booking: Booking;
  canUpdate: boolean;
  onCheckedOut: () => void;
}) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [checkingOut, setCheckingOut] = useState(false);
  const showUpdate = canUpdate && booking.bookingStatus !== 6 && booking.bookingStatus !== 5;
  const showCheckout = canUpdate && (booking.bookingStatus === 3 || booking.bookingStatus === 4);

  async function checkOutBooking() {
    const confirmed = await confirm({
      title: 'Check out guest?',
      description: `This will complete booking ${booking.bookingCode} and release its assigned rooms.`,
      confirmLabel: 'Check out',
    });
    if (!confirmed) return;

    setCheckingOut(true);
    try {
      await api.checkOutBooking(booking.id);
      showToast('Guest checked out and rooms released.', 'success');
      onCheckedOut();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to check out this booking.', 'error');
    } finally {
      setCheckingOut(false);
    }
  }

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
        <div>
          <p className="text-base font-semibold">{formatCurrency(booking.totalAmount)}</p>
          {booking.bookingStatus === 6 && booking.refund?.amount != null ? (
            <p className="text-xs text-muted-foreground">
              Refunded {formatCurrency(booking.refund.amount)}
              {booking.refund.status ? ` · ${booking.refund.status}` : ''}
            </p>
          ) : null}
        </div>
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
          {showCheckout ? (
            <Button
              variant="gold"
              size="sm"
              disabled={checkingOut}
              onClick={() => void checkOutBooking()}
            >
              <LogOut className="h-4 w-4" />
              {checkingOut ? 'Checking out…' : 'Checkout'}
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
        bookingStatuses: activeFilters.bookingStatuses,
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
    const timeout = window.setTimeout(() => {
      setPage(0);
      void load(0, filters);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [canRead, filters.bookingStatuses, filters.search]);

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
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {bookingStatusOptions.map((option) => {
                const selected = filters.bookingStatuses.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={selected ? 'gold' : 'outline'}
                    onClick={() =>
                      setFilters((current) => {
                        const next = selected
                          ? current.bookingStatuses.filter((status) => status !== option.value)
                          : [...current.bookingStatuses, option.value];
                        return { ...current, bookingStatuses: next };
                      })
                    }
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <TextField
                placeholder="Search guest or booking ID"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setFilters({ bookingStatuses: DEFAULT_STATUSES, search: '' })}
                aria-label="Clear filters"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading ? <LoadingState /> : null}

          {!loading && bookings.length === 0 ? <EmptyState /> : null}

          {!loading && bookings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  canUpdate={canUpdate}
                  onCheckedOut={() => void load(page, filters)}
                />
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
