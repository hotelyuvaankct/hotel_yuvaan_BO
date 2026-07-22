import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Edit, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import type { Booking, CancellationQuote } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingSourceOptions, bookingStatusOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';
import { PageToolbar } from '@/components/common/page-toolbar';
import { TextField } from '@/components/ui/form-fields';

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
  const [checkingOut, setCheckingOut] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelQuote, setCancelQuote] = useState<CancellationQuote | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

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

  async function openCancelFlow() {
    if (!booking) return;
    setCancelBusy(true);
    try {
      const quote = await api.getCancellationQuote(booking.id);
      setCancelQuote(quote);
      const confirmed = await confirm({
        title: 'Cancel booking?',
        description: `Cancel ${booking.bookingCode}. Estimated refund: ${formatCurrency(quote.refundAmount)} (${quote.refundPercent ?? 0}%). An OTP will be sent to support email.`,
        confirmLabel: 'Continue',
      });
      if (!confirmed) return;
      setCancelOpen(true);
      setOtpSent(false);
      setOtpCode('');
      setCancelReason('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load cancellation quote.', 'error');
    } finally {
      setCancelBusy(false);
    }
  }

  async function sendCancelOtp() {
    if (!booking) return;
    setCancelBusy(true);
    try {
      await api.requestCancelOtp(booking.id);
      setOtpSent(true);
      showToast('OTP sent to support email.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send OTP.', 'error');
    } finally {
      setCancelBusy(false);
    }
  }

  async function confirmCancelBooking() {
    if (!booking) return;
    if (!otpCode.trim()) {
      showToast('Enter the OTP from support email.', 'error');
      return;
    }
    setCancelBusy(true);
    try {
      await api.cancelBooking(booking.id, {
        otpCode: otpCode.trim(),
        cancellationReason: cancelReason.trim() || 'Cancelled from backoffice',
      });
      showToast('Booking cancelled.', 'success');
      setCancelOpen(false);
      setBooking(await api.getBooking(booking.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to cancel booking.', 'error');
    } finally {
      setCancelBusy(false);
    }
  }

  async function checkOutBooking() {
    if (!booking) return;
    const confirmed = await confirm({
      title: 'Check out guest?',
      description: `This will complete booking ${booking.bookingCode} and release its assigned rooms.`,
      confirmLabel: 'Check out',
    });
    if (!confirmed) return;

    setCheckingOut(true);
    try {
      const updated = await api.updateBooking(booking.id, { bookingStatus: 5 });
      setBooking(updated);
      showToast('Guest checked out and rooms released.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to check out this booking.', 'error');
    } finally {
      setCheckingOut(false);
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
              {canUpdate && booking.bookingStatus === 4 ? (
                <Button
                  variant="gold"
                  size="sm"
                  disabled={checkingOut}
                  onClick={() => void checkOutBooking()}
                >
                  <LogOut className="h-4 w-4" />
                  {checkingOut ? 'Checking out...' : 'Check out'}
                </Button>
              ) : null}
              {canUpdate && booking.bookingStatus !== 6 && booking.bookingStatus !== 5 ? (
                <Button variant="gold" size="sm" onClick={() => undefined}>
                  <Link to={`/bookings/${booking.id}/edit`} className="inline-flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Update
                  </Link>
                </Button>
              ) : null}
              {canDelete && booking.bookingStatus !== 6 && booking.bookingStatus !== 5 ? (
                <Button variant="outline" size="sm" disabled={cancelBusy} onClick={() => void openCancelFlow()}>
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

          <div className="space-y-6">
            {booking.refund ? (
              <Card>
                <CardHeader>
                  <CardTitle>Refund</CardTitle>
                  <CardDescription>Cancellation refund amount and status.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <DetailRow label="Refunded amount" value={formatCurrency(booking.refund.amount)} />
                  <DetailRow label="Percent" value={`${booking.refund.percent ?? 0}%`} />
                  <DetailRow label="Status" value={booking.refund.status || '-'} />
                  <DetailRow label="Channel" value={booking.refund.channel || '-'} />
                  <DetailRow label="Cancelled by" value={booking.refund.cancelledBy || '-'} />
                  <DetailRow
                    label="Payment marked refunded"
                    value={booking.refund.paymentRefunded ? 'Yes' : 'No'}
                  />
                  {booking.refund.note ? <DetailRow label="Note" value={booking.refund.note} /> : null}
                  {booking.refund.failureReason ? (
                    <DetailRow label="Failure" value={booking.refund.failureReason} />
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

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
        </div>
      ) : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirm cancellation</CardTitle>
              <CardDescription>
                Estimated refund:{' '}
                {formatCurrency(cancelQuote?.refundAmount)} ({cancelQuote?.refundPercent ?? 0}%).
                OTP is sent to support email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <TextField
                label="Cancellation reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              {!otpSent ? (
                <Button disabled={cancelBusy} onClick={() => void sendCancelOtp()}>
                  {cancelBusy ? 'Sending…' : 'Send OTP to support'}
                </Button>
              ) : (
                <>
                  <TextField
                    label="OTP code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelBusy}>
                      Close
                    </Button>
                    <Button disabled={cancelBusy} onClick={() => void confirmCancelBooking()}>
                      {cancelBusy ? 'Cancelling…' : 'Cancel booking'}
                    </Button>
                  </div>
                </>
              )}
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
