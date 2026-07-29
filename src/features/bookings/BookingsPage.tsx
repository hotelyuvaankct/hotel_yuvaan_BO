import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Eye, LogOut, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Booking } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingStatusOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { TextField } from '@/components/ui/form-fields';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';

const DEFAULT_STATUSES = [3, 4]; // Confirmed + Checked in
const emptyFilters = { bookingStatuses: DEFAULT_STATUSES as number[], search: '' };

function statusTone(status?: number): BadgeTone {
  if (status === 3 || status === 4) return 'warning';
  if (status === 5) return 'success';
  if (status === 6) return 'danger';
  if (status === 1 || status === 2) return 'warning';
  return 'neutral';
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

function BookingActions({
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

  async function checkOutBooking(event?: React.MouseEvent) {
    event?.stopPropagation();
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
    <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm">
        <Link to={`/bookings/${booking.id}`} className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View
        </Link>
      </Button>
      {showUpdate ? (
        <Button variant="outline" size="sm">
          <Link to={`/bookings/${booking.id}/edit`} className="inline-flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Update
          </Link>
        </Button>
      ) : null}
      {showCheckout ? (
        <Button variant="primary" size="sm" disabled={checkingOut} onClick={(e) => void checkOutBooking(e)}>
          <LogOut className="h-4 w-4" />
          {checkingOut ? 'Checking out…' : 'Checkout'}
        </Button>
      ) : null}
    </div>
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

  const columns = useMemo<Array<DataTableColumn<Booking>>>(
    () => [
      {
        key: 'bookingCode',
        header: 'Booking',
        render: (row) => (
          <div>
            <p className="font-medium">{row.bookingCode}</p>
            <p className="text-xs text-muted-foreground">{row.hotelName || '-'}</p>
          </div>
        ),
      },
      {
        key: 'guestName',
        header: 'Guest',
        render: (row) => (
          <div>
            <p className="font-medium">{row.guestName}</p>
            <p className="text-xs text-muted-foreground">{row.guestPhone || row.guestEmail || '-'}</p>
          </div>
        ),
      },
      {
        key: 'checkIn',
        header: 'Stay',
        render: (row) => (
          <span>
            {formatDate(row.checkIn)} → {formatDate(row.checkOut)}
          </span>
        ),
      },
      {
        key: 'bookingStatus',
        header: 'Status',
        render: (row) => (
          <Badge tone={statusTone(row.bookingStatus)}>{statusLabel(row.bookingStatus)}</Badge>
        ),
      },
      {
        key: 'totalAmount',
        header: 'Amount',
        numeric: true,
        render: (row) => (
          <div>
            <span>{formatCurrency(row.totalAmount)}</span>
            {row.bookingStatus === 6 && row.refund?.amount != null ? (
              <p className="text-xs text-muted-foreground">
                Refunded {formatCurrency(row.refund.amount)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <BookingActions
            booking={row}
            canUpdate={canUpdate}
            onCheckedOut={() => void load(page, filters)}
          />
        ),
      },
    ],
    [canUpdate, page, filters],
  );

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
                    variant={selected ? 'primary' : 'outline'}
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

          <ResponsiveList
            columns={columns}
            data={bookings}
            isLoading={loading}
            emptyState={<EmptyState />}
            renderMobileCard={(booking) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-semibold">{booking.bookingCode}</p>
                  <Badge tone={statusTone(booking.bookingStatus)} className="shrink-0">
                    {statusLabel(booking.bookingStatus)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Hotel</span>
                  <span className="text-foreground">{booking.hotelName || '-'}</span>
                  <span className="text-muted-foreground">Guest</span>
                  <span className="text-foreground">{booking.guestName}</span>
                  <span className="text-muted-foreground">Contact</span>
                  <span className="truncate text-foreground">
                    {booking.guestPhone || booking.guestEmail || '-'}
                  </span>
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="text-foreground">{formatDate(booking.checkIn)}</span>
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="text-foreground">{formatDate(booking.checkOut)}</span>
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground">{formatCurrency(booking.totalAmount)}</span>
                </div>
                <BookingActions
                  booking={booking}
                  canUpdate={canUpdate}
                  onCheckedOut={() => void load(page, filters)}
                />
              </div>
            )}
          />

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
