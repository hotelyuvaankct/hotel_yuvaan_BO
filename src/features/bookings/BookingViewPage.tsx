import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowRight,
  Ban,
  BedDouble,
  LogOut,
  Mail,
  Moon,
  Phone,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Booking, CancellationQuote } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingSourceOptions, bookingStatusOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useBreadcrumbLabel } from '@/components/common/breadcrumb-labels';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';
import { TextField } from '@/components/ui/form-fields';
import { cn } from '@/lib/utils';

function formatCurrency(value?: number) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatWeekday(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(new Date(value));
}

function nightsBetween(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return null;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

function guestInitials(name?: string) {
  if (!name) return 'G';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'G';
}

function statusTone(status?: number): BadgeTone {
  switch (status) {
    case 2:
      return 'warning';
    case 3:
    case 4:
      return 'info';
    case 5:
      return 'success';
    case 6:
      return 'danger';
    default:
      return 'neutral';
  }
}

export function BookingViewPage() {
  const { id } = useParams();
  const bookingId = Number(id);
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

  const crumbPath = id ? `/bookings/${id}` : undefined;
  useBreadcrumbLabel(crumbPath, booking?.bookingCode);
  useBreadcrumbLabel(id, booking?.bookingCode);

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
      const updated = await api.checkOutBooking(booking.id);
      setBooking(updated);
      showToast('Guest checked out and rooms released.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to check out this booking.', 'error');
    } finally {
      setCheckingOut(false);
    }
  }

  const nights = useMemo(
    () => nightsBetween(booking?.checkIn, booking?.checkOut),
    [booking?.checkIn, booking?.checkOut],
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

  if (loading) {
    return <FullPageLoader label="Loading booking details..." />;
  }

  if (!booking) {
    return <EmptyState label="No booking details found." />;
  }

  const showCheckout = canUpdate && (booking.bookingStatus === 3 || booking.bookingStatus === 4);
  const showCancel = canDelete && booking.bookingStatus !== 6 && booking.bookingStatus !== 5;
  const rooms = booking.rooms ?? [];
  const statusLabel = optionLabel(bookingStatusOptions, booking.bookingStatus);

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5 animate-fade-in-up sm:space-y-6">
      {/* Hero */}
      <section className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--gold)/0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,hsl(var(--brand)/0.08),transparent_50%)]"
        />
        <div className="relative space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={statusTone(booking.bookingStatus)}
                  className={cn(
                    (booking.bookingStatus === 3 || booking.bookingStatus === 4) &&
                      'bg-brand text-brand-foreground',
                  )}
                >
                  {statusLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {optionLabel(bookingSourceOptions, booking.source)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Booking
                </p>
                <h1 className="mt-1 break-all text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {booking.bookingCode}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{booking.hotelName}</p>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl bg-background/80 px-4 py-3 text-left shadow-sm ring-1 ring-border/60 sm:text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-semibold tracking-tight text-brand">
                {formatCurrency(booking.totalAmount)}
              </p>
            </div>
          </div>

          {/* Stay journey */}
          <div className="rounded-2xl bg-background/70 p-4 ring-1 ring-border/50 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Check-in
                </p>
                <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">
                  {formatDate(booking.checkIn)}
                </p>
                <p className="text-xs text-muted-foreground">{formatWeekday(booking.checkIn)}</p>
              </div>

              <div className="flex shrink-0 flex-col items-center gap-1 px-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Moon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {nights != null ? `${nights} night${nights === 1 ? '' : 's'}` : '—'}
                </p>
                <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground/70 sm:block" />
              </div>

              <div className="min-w-0 flex-1 text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Check-out
                </p>
                <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">
                  {formatDate(booking.checkOut)}
                </p>
                <p className="text-xs text-muted-foreground">{formatWeekday(booking.checkOut)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Chip icon={Users} label={`${booking.totalGuests ?? '—'} guests`} />
              <Chip
                icon={BedDouble}
                label={`${rooms.reduce((sum, line) => sum + (line.quantity ?? 0), 0) || rooms.length} rooms`}
              />
            </div>
          </div>

          {(showCheckout || showCancel) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {showCancel ? (
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={cancelBusy}
                  onClick={() => void openCancelFlow()}
                >
                  <Ban className="h-4 w-4" />
                  Cancel booking
                </Button>
              ) : null}
              {showCheckout ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={checkingOut}
                  onClick={() => void checkOutBooking()}
                >
                  <LogOut className="h-4 w-4" />
                  {checkingOut ? 'Checking out…' : 'Check out guest'}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* Guest */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
            {guestInitials(booking.guestName)}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Guest
              </p>
              <h2 className="mt-0.5 truncate text-xl font-semibold text-foreground">
                {booking.guestName}
              </h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {booking.guestEmail ? (
                <a
                  href={`mailto:${booking.guestEmail}`}
                  className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{booking.guestEmail}</span>
                </a>
              ) : null}
              {booking.guestPhone ? (
                <a
                  href={`tel:${booking.guestPhone}`}
                  className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {booking.guestPhone}
                </a>
              ) : null}
              {!booking.guestEmail && !booking.guestPhone ? (
                <p className="text-sm text-muted-foreground">No contact details on file.</p>
              ) : null}
            </div>
          </div>
        </div>

        {booking.notes ? (
          <div className="mt-5 rounded-xl bg-muted/40 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{booking.notes}</p>
          </div>
        ) : null}

        {booking.cancellationReason ? (
          <div className="mt-3 rounded-xl bg-destructive/5 px-4 py-3 ring-1 ring-destructive/15">
            <p className="text-xs font-medium uppercase tracking-wide text-destructive">
              Cancellation reason
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{booking.cancellationReason}</p>
          </div>
        ) : null}
      </section>

      {/* Rooms — card grid, not a table */}
      <section className="min-w-0 space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Rooms</h2>
            <p className="text-xs text-muted-foreground">
              {rooms.length === 0
                ? 'No rooms on this booking'
                : `${rooms.length} room type${rooms.length === 1 ? '' : 's'} booked`}
            </p>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6">
            <EmptyState />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rooms.map((line) => (
              <li
                key={line.id ?? `${line.roomTypeId}-${line.quantity}`}
                className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-foreground">{line.roomTypeName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {line.quantity} × {line.totalNights} night
                      {line.totalNights === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/70 pt-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Per night</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(line.pricePerNight)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">Line total</p>
                    <p className="text-base font-semibold text-brand">
                      {formatCurrency(line.lineTotal)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {booking.refund ? (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-foreground">Refund</h2>
          <p className="mt-1 text-xs text-muted-foreground">Cancellation refund summary</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatPill label="Amount" value={formatCurrency(booking.refund.amount)} highlight />
            <StatPill label="Percent" value={`${booking.refund.percent ?? 0}%`} />
            <StatPill label="Status" value={booking.refund.status || '—'} />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <SoftFact label="Channel" value={booking.refund.channel || '—'} />
            <SoftFact label="Cancelled by" value={booking.refund.cancelledBy || '—'} />
            <SoftFact
              label="Payment marked refunded"
              value={booking.refund.paymentRefunded ? 'Yes' : 'No'}
            />
            {booking.refund.note ? <SoftFact label="Note" value={booking.refund.note} /> : null}
            {booking.refund.failureReason ? (
              <SoftFact label="Failure" value={booking.refund.failureReason} />
            ) : null}
          </div>
        </section>
      ) : null}

      <BottomSheet isOpen={cancelOpen} onClose={() => setCancelOpen(false)}>
        <BottomSheet.Header title="Confirm cancellation" />
        <BottomSheet.Body className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Estimated refund:{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(cancelQuote?.refundAmount)} ({cancelQuote?.refundPercent ?? 0}%)
            </span>
            . OTP is sent to support email.
          </p>
          <TextField
            label="Cancellation reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          {otpSent ? (
            <TextField
              label="OTP code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
          ) : null}
        </BottomSheet.Body>
        <BottomSheet.Footer className="justify-stretch gap-2 sm:justify-end">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => setCancelOpen(false)}
            disabled={cancelBusy}
          >
            Close
          </Button>
          {!otpSent ? (
            <Button className="flex-1 sm:flex-none" disabled={cancelBusy} onClick={() => void sendCancelOtp()}>
              {cancelBusy ? 'Sending…' : 'Send OTP'}
            </Button>
          ) : (
            <Button
              variant="danger"
              className="flex-1 sm:flex-none"
              disabled={cancelBusy}
              onClick={() => void confirmCancelBooking()}
            >
              {cancelBusy ? 'Cancelling…' : 'Cancel booking'}
            </Button>
          )}
        </BottomSheet.Footer>
      </BottomSheet>
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {label}
    </span>
  );
}

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', highlight ? 'text-brand' : 'text-foreground')}>
        {value}
      </p>
    </div>
  );
}

function SoftFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
