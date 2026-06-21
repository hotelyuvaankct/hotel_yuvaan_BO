import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Eye, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { Booking, HotelSummary } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingStatusOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { Pagination } from '@/components/common/pagination';
import { SelectField, TextField } from '@/components/ui/form-fields';

const emptyFilters = { hotelId: '', bookingStatus: '', guestName: '' };

function statusVariant(status?: number) {
  if (status === 3) return 'success';
  if (status === 4) return 'gold';
  if (status === 6) return 'secondary';
  if (status === 1 || status === 2) return 'warning';
  return 'secondary';
}

function formatCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
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
        guestName: activeFilters.guestName,
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
  }, [canRead, filters.hotelId, filters.bookingStatus, filters.guestName]);

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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_220px_1fr_auto]">
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
              options={bookingStatusOptions.map((option) => ({ value: option.value, label: option.label }))}
              onChange={(event) => setFilters((current) => ({ ...current, bookingStatus: event.target.value }))}
            />
            <TextField
              placeholder="Search guest name"
              value={filters.guestName}
              onChange={(event) => setFilters((current) => ({ ...current, guestName: event.target.value }))}
            />
            <Button type="button" variant="outline" onClick={() => setFilters(emptyFilters)}>Clear</Button>
          </div>

          <div className="overflow-x-auto">
            {loading ? <LoadingState /> : null}
            {!loading ? (
              <table className="w-full min-w-[980px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Guest</th>
                    <th className="px-3 py-2 font-medium">Hotel</th>
                    <th className="px-3 py-2 font-medium">Check-in</th>
                    <th className="px-3 py-2 font-medium">Check-out</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6" colSpan={8}><EmptyState /></td>
                    </tr>
                  ) : null}
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-t border-border">
                      <td className="px-3 py-3 font-medium">{booking.bookingCode}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{booking.guestName}</p>
                        <p className="text-xs text-muted-foreground">{booking.guestPhone || booking.guestEmail || '-'}</p>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{booking.hotelName}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(booking.checkIn)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(booking.checkOut)}</td>
                      <td className="px-3 py-3">
                        <Badge variant={statusVariant(booking.bookingStatus)}>
                          {optionLabel(bookingStatusOptions, booking.bookingStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 font-medium">{formatCurrency(booking.totalAmount)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => undefined}>
                            <Link to={`/bookings/${booking.id}`} className="inline-flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                          </Button>
                          {canUpdate && booking.bookingStatus !== 6 && booking.bookingStatus !== 5 ? (
                            <Button variant="outline" size="sm" onClick={() => undefined}>
                              <Link to={`/bookings/${booking.id}/edit`} className="inline-flex items-center gap-2">
                                <CalendarPlus className="h-4 w-4" />
                                Update
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>

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
