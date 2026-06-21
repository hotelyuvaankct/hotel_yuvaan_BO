import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { HotelSummary } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { bookingStatusOptions } from '@/lib/enums';
import { addDaysIso, validateBookingForm } from '@/lib/form-validation';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateField, SelectField, TextField } from '@/components/ui/form-fields';
import { FullPageLoader } from '@/components/common/loading-state';

export function BookingFormPage() {
  const { id } = useParams();
  const bookingId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canUpdate = hasPermission(session?.perms, 'bookings', 'update');
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    hotelId: '',
    checkIn: '',
    checkOut: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    totalGuests: '1',
    bookingStatus: '3',
    notes: '',
  });

  const minCheckOut = form.checkIn ? addDaysIso(form.checkIn, 1) : undefined;

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    clearError(field);
  }

  useEffect(() => {
    if (!bookingId) {
      navigate('/bookings', { replace: true });
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const [hotelList, booking] = await Promise.all([
          api.listHotels(),
          api.getBooking(bookingId),
        ]);
        setHotels(hotelList ?? []);
        setForm({
          hotelId: String(booking.hotelId),
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail ?? '',
          guestPhone: booking.guestPhone ?? '',
          totalGuests: String(booking.totalGuests ?? 1),
          bookingStatus: String(booking.bookingStatus ?? 3),
          notes: booking.notes ?? '',
        });
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load booking form.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [bookingId, navigate, showToast]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdate || !bookingId) return;

    const nextErrors = validateBookingForm(form, true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.updateBooking(bookingId, {
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guestName: form.guestName.trim(),
        guestEmail: form.guestEmail.trim() || undefined,
        guestPhone: form.guestPhone.trim() || undefined,
        totalGuests: Number(form.totalGuests),
        bookingStatus: Number(form.bookingStatus),
        notes: form.notes.trim() || undefined,
      });
      showToast('Booking updated.', 'success');
      navigate('/bookings');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to save booking.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!bookingId) {
    return null;
  }

  if (loading) {
    return <FullPageLoader label="Loading booking..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/bookings')}>
        <ArrowLeft className="h-4 w-4" />
        Back to bookings
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Update booking</CardTitle>
          <CardDescription>Check-out must be after check-in. Guest email or phone is required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit} noValidate>
            <SelectField
              label="Hotel"
              required
              disabled
              value={form.hotelId}
              error={errors.hotelId}
              placeholder="Select hotel"
              options={hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))}
              onChange={(event) => updateField('hotelId', event.target.value)}
            />
            <DateField
              label="Check-in"
              required
              value={form.checkIn}
              error={errors.checkIn}
              onChange={(event) => {
                const checkIn = event.target.value;
                setForm((current) => {
                  const next = { ...current, checkIn };
                  if (!next.checkOut || next.checkOut <= checkIn) {
                    next.checkOut = addDaysIso(checkIn, 1);
                  }
                  return next;
                });
                clearError('checkIn');
                clearError('checkOut');
              }}
            />
            <DateField
              label="Check-out"
              required
              value={form.checkOut}
              min={minCheckOut}
              error={errors.checkOut}
              onChange={(event) => updateField('checkOut', event.target.value)}
            />
            <TextField
              label="Guest name"
              required
              value={form.guestName}
              error={errors.guestName}
              onChange={(event) => updateField('guestName', event.target.value)}
            />
            <TextField
              label="Guest email"
              type="email"
              value={form.guestEmail}
              error={errors.guestEmail}
              hint="Required if phone is empty"
              onChange={(event) => {
                updateField('guestEmail', event.target.value);
                clearError('guestPhone');
              }}
            />
            <TextField
              label="Guest phone"
              type="tel"
              value={form.guestPhone}
              error={errors.guestPhone}
              hint="Required if email is empty"
              onChange={(event) => {
                updateField('guestPhone', event.target.value);
                clearError('guestEmail');
              }}
            />
            <TextField
              label="Total guests"
              required
              min={1}
              type="number"
              value={form.totalGuests}
              error={errors.totalGuests}
              onChange={(event) => updateField('totalGuests', event.target.value)}
            />
            <SelectField
              label="Booking status"
              value={form.bookingStatus}
              placeholder=""
              options={bookingStatusOptions
                .filter((option) => option.value !== 6 && option.value !== 7 && option.value !== 8)
                .map((option) => ({ value: option.value, label: option.label }))}
              onChange={(event) => updateField('bookingStatus', event.target.value)}
            />
            <TextField
              label="Notes"
              wrapperClassName="md:col-span-2"
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" variant="gold" disabled={!canUpdate || saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Update booking'}
              </Button>
              <Link to="/bookings" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
