import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Eye, LogOut, Moon, RefreshCw, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Booking } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import {
  BookingStatus,
  bookingStatusDisplayLabel,
  bookingStatusOptions,
  bookingStatusTone,
} from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { fieldControlClass } from '@/components/ui/form-fields';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatDayMonth } from '@/lib/format';
import { InitialsAvatar } from '@/components/ui/initials-avatar';

const DEFAULT_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN];
const emptyFilters = { bookingStatuses: DEFAULT_STATUSES as number[], search: '' };

function nightsBetween(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return null;
  const a = new Date(checkIn.includes('T') ? checkIn : `${checkIn}T00:00:00`);
  const b = new Date(checkOut.includes('T') ? checkOut : `${checkOut}T00:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
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
  const showCheckout =
    canUpdate &&
    (booking.bookingStatus === BookingStatus.CONFIRMED ||
      booking.bookingStatus === BookingStatus.CHECKED_IN);

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
      <Link
        to={`/bookings/${booking.id}`}
        aria-label="View booking"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-semibold transition-colors hover:bg-accent"
      >
        <Eye className="h-4 w-4" />
        View
      </Link>
      {showCheckout ? (
        <Button
          variant="primary"
          size="sm"
          className="h-9 gap-1.5 px-3"
          aria-label="Checkout"
          disabled={checkingOut}
          onClick={(e) => void checkOutBooking(e)}
        >
          <LogOut className="h-4 w-4" />
          {checkingOut ? '…' : 'Checkout'}
        </Button>
      ) : null}
    </div>
  );
}

function BookingListCard({
  booking,
  canUpdate,
  onCheckedOut,
}: {
  booking: Booking;
  canUpdate: boolean;
  onCheckedOut: () => void;
}) {
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const contact = booking.guestPhone || booking.guestEmail;

  return (
    <div className="space-y-3.5">
      <div className="flex items-start gap-3">
        <InitialsAvatar name={booking.guestName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{booking.guestName}</p>
              <p className="truncate text-xs text-muted-foreground">{booking.bookingCode}</p>
            </div>
            <Badge
              tone={bookingStatusTone(booking.bookingStatus)}
              className={cn(
                'shrink-0',
                (booking.bookingStatus === BookingStatus.CONFIRMED ||
                  booking.bookingStatus === BookingStatus.CHECKED_IN) &&
                  'bg-brand text-brand-foreground',
              )}
            >
              {bookingStatusDisplayLabel(booking.bookingStatus)}
            </Badge>
          </div>
          {contact ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{contact}</p> : null}
        </div>
      </div>

      <div className="rounded-xl bg-muted/40 px-3 py-3">
        {booking.hotelName ? (
          <div className="mb-2.5 flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <p className="truncate text-xs font-medium">{booking.hotelName}</p>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Check-in
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
              {formatDayMonth(booking.checkIn)}
            </p>
          </div>

          <div className="flex min-w-0 flex-[1.2] items-center gap-1.5" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-brand">
              <Moon className="h-3 w-3" />
              <span className="text-[11px] font-semibold tabular-nums">
                {nights != null ? `${nights}n` : '—'}
              </span>
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Check-out
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
              {formatDayMonth(booking.checkOut)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Amount</p>
          <p className="text-base font-semibold text-brand">{formatCurrency(booking.totalAmount)}</p>
          {booking.bookingStatus === 6 && booking.refund?.amount != null ? (
            <p className="text-[11px] text-muted-foreground">
              Refunded {formatCurrency(booking.refund.amount)}
            </p>
          ) : null}
        </div>
        <BookingActions booking={booking} canUpdate={canUpdate} onCheckedOut={onCheckedOut} />
      </div>
    </div>
  );
}

export function BookingsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
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
        header: 'Guest',
        render: (row) => (
          <div className="flex items-center gap-3">
            <InitialsAvatar
              name={row.guestName}
              size="sm"
              className="bg-brand/10 text-brand"
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{row.guestName}</p>
              <p className="truncate text-xs text-muted-foreground">{row.bookingCode}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'guestName',
        header: 'Hotel',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.hotelName || '—'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.guestPhone || row.guestEmail || '—'}
            </p>
          </div>
        ),
      },
      {
        key: 'checkIn',
        header: 'Stay',
        render: (row) => {
          const nights = nightsBetween(row.checkIn, row.checkOut);
          return (
            <div>
              <p className="font-medium">
                {formatDayMonth(row.checkIn)} → {formatDayMonth(row.checkOut)}
              </p>
              <p className="text-xs text-muted-foreground">
                {nights != null ? `${nights} night${nights === 1 ? '' : 's'}` : formatDate(row.checkIn)}
              </p>
            </div>
          );
        },
      },
      {
        key: 'bookingStatus',
        header: 'Status',
        render: (row) => (
          <Badge
            tone={bookingStatusTone(row.bookingStatus)}
            className={cn(
              (row.bookingStatus === BookingStatus.CONFIRMED ||
                row.bookingStatus === BookingStatus.CHECKED_IN) &&
                'bg-brand text-brand-foreground',
            )}
          >
            {bookingStatusDisplayLabel(row.bookingStatus)}
          </Badge>
        ),
      },
      {
        key: 'totalAmount',
        header: 'Amount',
        numeric: true,
        render: (row) => (
          <div>
            <span className="font-semibold text-brand">{formatCurrency(row.totalAmount)}</span>
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
    <div className="min-w-0 space-y-5 animate-fade-in-up">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Bookings</CardTitle>
            <CardDescription>
              {totalElements} booking{totalElements === 1 ? '' : 's'} found
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 shrink-0 px-0 sm:w-auto sm:px-3"
            aria-label="Refresh"
            onClick={() => void load()}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Status</p>
              <div
                role="group"
                aria-label="Filter by booking status"
                className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-muted/30 p-1.5"
              >
                {bookingStatusOptions.map((option) => {
                  const selected = filters.bookingStatuses.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:px-3 sm:text-sm',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        selected
                          ? 'bg-brand text-brand-foreground shadow-sm'
                          : 'bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
                      )}
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
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="bookings-search"
                type="search"
                placeholder="Search guest or booking ID"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                className={cn(
                  fieldControlClass,
                  'w-full min-w-0 pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden',
                )}
                aria-label="Search bookings"
              />
              {filters.search ? (
                <button
                  type="button"
                  className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setFilters((current) => ({ ...current, search: '' }))}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <ResponsiveList
            columns={columns}
            data={bookings}
            isLoading={loading}
            emptyState={<EmptyState />}
            onRowClick={(booking) => navigate(`/bookings/${booking.id}`)}
            renderMobileCard={(booking) => (
              <BookingListCard
                booking={booking}
                canUpdate={canUpdate}
                onCheckedOut={() => void load(page, filters)}
              />
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
