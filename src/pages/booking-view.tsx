import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Edit } from 'lucide-react';
import { api } from '@/lib/api';
import type { Booking } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingSourceOptions, bookingStatusOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';
import { PageToolbar } from '@/components/common/page-toolbar';

function formatCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function BookingViewPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canRead = hasPermission(session?.perms, 'bookings', 'read');
  const canUpdate = hasPermission(session?.perms, 'bookings', 'update');
  const canDelete = hasPermission(session?.perms, 'bookings', 'delete');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!canRead || !bookingId) return;
      setLoading(true);
      try {
        setBooking(await api.getBooking(bookingId));
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load booking details.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [bookingId, canRead, showToast]);

  async function cancelBooking() {
    if (!booking) return;
    const confirmed = await confirm({
      title: 'Cancel booking?',
      description: `This will cancel booking ${booking.bookingCode}.`,
      confirmLabel: 'Cancel booking',
    });
    if (!confirmed) return;
    try {
      await api.cancelBooking(booking.id, { cancellationReason: 'Cancelled from backoffice' });
      showToast('Booking cancelled.', 'success');
      setBooking(await api.getBooking(booking.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to cancel booking.', 'error');
    }
  }

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

  if (loading) {
    return <FullPageLoader label="Loading booking details..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/bookings')}>
        <ArrowLeft className="h-4 w-4" />
        Back to bookings
      </Button>

      <PageToolbar
        title="Booking details"
        description="Reservation summary, guest information, and room lines."
        actions={
          booking ? (
            <div className="flex flex-wrap gap-2">
              {canUpdate && booking.bookingStatus !== 6 && booking.bookingStatus !== 5 ? (
                <Button variant="gold" size="sm" onClick={() => undefined}>
                  <Link to={`/bookings/${booking.id}/edit`} className="inline-flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Update
                  </Link>
                </Button>
              ) : null}
              {canDelete && booking.bookingStatus !== 6 && booking.bookingStatus !== 5 ? (
                <Button variant="outline" size="sm" onClick={() => void cancelBooking()}>
                  <Ban className="h-4 w-4" />
                  Cancel booking
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {!booking ? <EmptyState label="No booking details found." /> : null}
      {booking ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{booking.bookingCode}</CardTitle>
              <CardDescription>{booking.hotelName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Guest" value={booking.guestName} />
              <DetailRow label="Email" value={booking.guestEmail || '-'} />
              <DetailRow label="Phone" value={booking.guestPhone || '-'} />
              <DetailRow label="Check-in" value={formatDate(booking.checkIn)} />
              <DetailRow label="Check-out" value={formatDate(booking.checkOut)} />
              <DetailRow label="Guests" value={String(booking.totalGuests ?? '-')} />
              <DetailRow label="Source" value={optionLabel(bookingSourceOptions, booking.source)} />
              <DetailRow label="Status" value={optionLabel(bookingStatusOptions, booking.bookingStatus)} />
              <DetailRow label="Total amount" value={formatCurrency(booking.totalAmount)} />
              <DetailRow label="Notes" value={booking.notes || '-'} />
              {booking.cancellationReason ? <DetailRow label="Cancellation reason" value={booking.cancellationReason} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Room lines</CardTitle>
              <CardDescription>Booked room types and pricing breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Room type</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Nights</th>
                    <th className="px-3 py-2 font-medium">Rate</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(booking.rooms ?? []).length === 0 ? (
                    <tr><td className="px-3 py-6" colSpan={5}><EmptyState /></td></tr>
                  ) : null}
                  {(booking.rooms ?? []).map((line) => (
                    <tr key={line.id ?? `${line.roomTypeId}-${line.quantity}`} className="border-t border-border">
                      <td className="px-3 py-3 font-medium">{line.roomTypeName}</td>
                      <td className="px-3 py-3">{line.quantity}</td>
                      <td className="px-3 py-3">{line.totalNights}</td>
                      <td className="px-3 py-3">{formatCurrency(line.pricePerNight)}</td>
                      <td className="px-3 py-3 font-medium">{formatCurrency(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
