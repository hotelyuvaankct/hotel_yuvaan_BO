import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronLeft,
  Plus,
  Sparkles,
  Users,
  Wifi,
} from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type {
  AvailableRoomType,
  BookingQuote,
  ExtraService,
  HotelSummary,
  RatePlan,
  RoomUpgrade,
} from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import {
  addDaysIso,
  isBlank,
  isValidEmail,
  isValidPhone,
  todayIso,
  validateDateRange,
} from '@/lib/form-validation';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateField, SelectField, TextField } from '@/components/ui/form-fields';
import { FullPageLoader } from '@/components/common/loading-state';
import { cn } from '@/lib/utils';

type WizardStep = 'stay' | 'rooms' | 'rates' | 'checkout';

type WizardState = {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  rooms: string;
  roomTypeId: number | null;
  roomTypeName: string;
  ratePlanCode: string;
  ratePlanLabel: string;
  upgradeRoomTypeId: number | null;
  upgradeRoomTypeName: string;
  extraServiceIds: number[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string;
};

const stepOrder: WizardStep[] = ['stay', 'rooms', 'rates', 'checkout'];

const stepTitles: Record<WizardStep, string> = {
  stay: 'Details of your stay',
  rooms: 'Select a room',
  rates: 'Select a rate plan',
  checkout: 'Select extra services',
};

function formatCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function formatDateRange(checkIn: string, checkOut: string) {
  return `${formatDate(checkIn)} — ${formatDate(checkOut)}`;
}

function guestSummary(adults: string, children: string) {
  const adultCount = Number(adults) || 0;
  const childCount = Number(children) || 0;
  const parts = [`${adultCount} adult${adultCount === 1 ? '' : 's'}`];
  if (childCount > 0) parts.push(`${childCount} child${childCount === 1 ? '' : 'ren'}`);
  return parts.join(', ');
}

function adultOptions() {
  return Array.from({ length: 8 }, (_, index) => ({
    value: index + 1,
    label: `${index + 1} adult${index === 0 ? '' : 's'}`,
  }));
}

function childOptions() {
  return Array.from({ length: 7 }, (_, index) => ({
    value: index,
    label: index === 0 ? 'No children' : `${index} child${index === 1 ? '' : 'ren'}`,
  }));
}

function roomCountOptions() {
  return Array.from({ length: 5 }, (_, index) => ({
    value: index + 1,
    label: `${index + 1} room${index === 0 ? '' : 's'}`,
  }));
}

function buildCheckoutPayload(state: WizardState): Parameters<typeof api.checkoutBooking>[0] | null {
  const hotelId = Number(state.hotelId);
  if (!hotelId || !state.checkIn || !state.checkOut || !state.roomTypeId || !state.ratePlanCode || isBlank(state.guestName)) {
    return null;
  }
  return {
    hotelId,
    checkIn: state.checkIn,
    checkOut: state.checkOut,
    roomTypeId: state.roomTypeId,
    ratePlanCode: state.ratePlanCode,
    adults: Number(state.adults) || 1,
    children: Number(state.children) || 0,
    rooms: Number(state.rooms) || 1,
    extraServiceIds: state.extraServiceIds.length ? state.extraServiceIds : undefined,
    upgradeRoomTypeId: state.upgradeRoomTypeId ?? undefined,
    guestName: state.guestName.trim(),
    guestEmail: state.guestEmail.trim() || undefined,
    guestPhone: state.guestPhone.trim() || undefined,
    notes: state.notes.trim() || undefined,
  };
}

function validateStayStep(state: WizardState) {
  const errors: Record<string, string> = {};
  if (isBlank(state.hotelId)) errors.hotelId = 'Select a hotel.';
  const dateError = validateDateRange(state.checkIn, state.checkOut);
  if (dateError) {
    if (!state.checkIn) errors.checkIn = 'Check-in date is required.';
    else if (!state.checkOut) errors.checkOut = 'Check-out date is required.';
    else errors.checkOut = dateError;
  }
  if (state.checkIn && state.checkIn < todayIso()) {
    errors.checkIn = 'Check-in cannot be in the past.';
  }
  const adults = Number(state.adults);
  if (!Number.isInteger(adults) || adults < 1) errors.adults = 'At least 1 adult is required.';
  const children = Number(state.children);
  if (!Number.isInteger(children) || children < 0) errors.children = 'Invalid children count.';
  const rooms = Number(state.rooms);
  if (!Number.isInteger(rooms) || rooms < 1) errors.rooms = 'At least 1 room is required.';
  return errors;
}

function validateGuestStep(state: WizardState) {
  const errors: Record<string, string> = {};
  if (isBlank(state.guestName)) errors.guestName = 'Guest name is required.';
  else if (state.guestName.trim().length < 2) errors.guestName = 'Guest name must be at least 2 characters.';
  if (!isBlank(state.guestEmail) && !isValidEmail(state.guestEmail)) errors.guestEmail = 'Enter a valid email address.';
  if (!isBlank(state.guestPhone) && !isValidPhone(state.guestPhone)) errors.guestPhone = 'Enter a valid phone number.';
  if (isBlank(state.guestEmail) && isBlank(state.guestPhone)) {
    errors.guestEmail = 'Provide guest email or phone.';
    errors.guestPhone = 'Provide guest email or phone.';
  }
  return errors;
}

function BookingSummarySidebar({
  quote,
  loading,
  roomLabel,
  onContinue,
  continueLabel = 'Continue',
  disabled,
}: {
  quote: BookingQuote | null;
  loading?: boolean;
  roomLabel?: string;
  onContinue?: () => void;
  continueLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Card className="sticky top-6 border-gold-200/60 shadow-lg shadow-gold-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">My booking</CardTitle>
        {quote?.totalNights ? (
          <CardDescription>{quote.totalNights} night{quote.totalNights === 1 ? '' : 's'}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading ? (
          <p className="text-muted-foreground">Calculating totals...</p>
        ) : quote ? (
          <>
            <div className="space-y-1 border-b border-border pb-3">
              <p className="font-medium">{formatDateRange(quote.checkIn, quote.checkOut)}</p>
              <p className="text-muted-foreground">
                {guestSummary(String(quote.adults ?? 1), String(quote.children ?? 0))}
              </p>
            </div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">Room</p>
                <p className="text-muted-foreground">{roomLabel ?? quote.roomTypeName}</p>
                {quote.ratePlanLabel ? <p className="text-xs text-muted-foreground">{quote.ratePlanLabel}</p> : null}
              </div>
              <p className="font-semibold">{formatCurrency(quote.roomSubtotal)}</p>
            </div>
            {quote.selectedExtras && quote.selectedExtras.length > 0 ? (
              <div className="space-y-2 border-t border-border pt-3">
                {quote.selectedExtras.map((extra) => (
                  <div key={extra.id} className="flex justify-between gap-2 text-muted-foreground">
                    <span>{extra.name}</span>
                    <span>{extra.free ? 'Free' : formatCurrency(extra.price)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-3 text-muted-foreground">
              <span>Taxes</span>
              <span>{formatCurrency(quote.taxAmount)}</span>
            </div>
            <div className="flex items-end justify-between border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatCurrency(quote.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">Taxes included</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Select dates and a room to see pricing.</p>
        )}
        {onContinue ? (
          <Button variant="gold" className="w-full uppercase tracking-wide" disabled={disabled || loading || !quote} onClick={onContinue}>
            {continueLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function BookingWizardPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(session?.perms, 'bookings', 'create');

  const [step, setStep] = useState<WizardStep>('stay');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomType[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
  const [upgrades, setUpgrades] = useState<RoomUpgrade[]>([]);
  const [quote, setQuote] = useState<BookingQuote | null>(null);

  const [state, setState] = useState<WizardState>({
    hotelId: '',
    checkIn: todayIso(),
    checkOut: addDaysIso(todayIso(), 1),
    adults: '2',
    children: '0',
    rooms: '1',
    roomTypeId: null,
    roomTypeName: '',
    ratePlanCode: '',
    ratePlanLabel: '',
    upgradeRoomTypeId: null,
    upgradeRoomTypeName: '',
    extraServiceIds: [],
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    notes: '',
  });

  const minCheckOut = state.checkIn ? addDaysIso(state.checkIn, 1) : addDaysIso(todayIso(), 1);
  const stepIndex = stepOrder.indexOf(step);

  const selectedRoomLabel = useMemo(() => {
    if (state.upgradeRoomTypeName) return state.upgradeRoomTypeName;
    return state.roomTypeName;
  }, [state.roomTypeName, state.upgradeRoomTypeName]);

  const updateState = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }, []);

  const refreshQuote = useCallback(async (nextState: WizardState) => {
    const payload = buildCheckoutPayload({
      ...nextState,
      guestName: nextState.guestName || 'Guest',
    });
    if (!payload) {
      setQuote(null);
      return;
    }
    try {
      const result = await api.quoteBooking(payload);
      setQuote(result);
    } catch {
      setQuote(null);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const hotelList = await api.listHotels();
        setHotels(hotelList ?? []);
        const today = todayIso();
        setState((current) => ({
          ...current,
          hotelId: String(hotelList?.[0]?.id ?? ''),
          checkIn: today,
          checkOut: addDaysIso(today, 1),
        }));
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load booking wizard.', 'error');
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [showToast]);

  useEffect(() => {
    if (step !== 'checkout' || !state.roomTypeId || !state.ratePlanCode) return;
    void refreshQuote(state);
  }, [step, state, refreshQuote]);

  async function loadAvailability() {
    setBusy(true);
    try {
      const rooms = await api.searchAvailability({
        hotelId: Number(state.hotelId),
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        adults: Number(state.adults),
        children: Number(state.children),
        rooms: Number(state.rooms),
      });
      setAvailableRooms(rooms ?? []);
      if (!rooms?.length) {
        showToast('No rooms available for the selected dates and guests.', 'error');
      } else {
        setStep('rooms');
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to search availability.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function selectRoom(room: AvailableRoomType) {
    setBusy(true);
    try {
      const plans = await api.getRatePlans(room.roomTypeId, {
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        rooms: Number(state.rooms),
      });
      setRatePlans(plans ?? []);
      setState((current) => ({
        ...current,
        roomTypeId: room.roomTypeId,
        roomTypeName: room.name,
        upgradeRoomTypeId: null,
        upgradeRoomTypeName: '',
        ratePlanCode: '',
        ratePlanLabel: '',
        extraServiceIds: [],
      }));
      setStep('rates');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to load rate plans.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function selectRatePlan(plan: RatePlan) {
    setBusy(true);
    try {
      const hotelId = Number(state.hotelId);
      const [services, upgradeList] = await Promise.all([
        api.getExtraServices(hotelId),
        state.roomTypeId
          ? api.getRoomUpgrades({
              hotelId,
              roomTypeId: state.roomTypeId,
              checkIn: state.checkIn,
              checkOut: state.checkOut,
              adults: Number(state.adults),
              children: Number(state.children),
            })
          : Promise.resolve([]),
      ]);
      setExtraServices(services ?? []);
      setUpgrades(upgradeList ?? []);
      setState((current) => ({
        ...current,
        ratePlanCode: plan.code,
        ratePlanLabel: plan.label,
        extraServiceIds: [],
        upgradeRoomTypeId: null,
        upgradeRoomTypeName: '',
      }));
      setStep('checkout');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to load checkout options.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleExtraService(serviceId: number) {
    const nextIds = state.extraServiceIds.includes(serviceId)
      ? state.extraServiceIds.filter((id) => id !== serviceId)
      : [...state.extraServiceIds, serviceId];
    const nextState = { ...state, extraServiceIds: nextIds };
    setState(nextState);
    await refreshQuote(nextState);
  }

  async function applyUpgrade(upgrade: RoomUpgrade) {
    const nextState = {
      ...state,
      upgradeRoomTypeId: upgrade.roomTypeId,
      upgradeRoomTypeName: upgrade.name,
    };
    setState(nextState);
    await refreshQuote(nextState);
    showToast(`Upgraded to ${upgrade.name}.`, 'success');
  }

  function goBack() {
    if (stepIndex <= 0) {
      navigate('/bookings');
      return;
    }
    setStep(stepOrder[stepIndex - 1]);
  }

  async function onStaySubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateStayStep(state);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }
    await loadAvailability();
  }

  async function onCheckoutSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canCreate) return;
    const guestErrors = validateGuestStep(state);
    setErrors(guestErrors);
    if (Object.keys(guestErrors).length > 0) {
      showToast('Please fix guest details.', 'error');
      return;
    }
    const payload = buildCheckoutPayload(state);
    if (!payload) {
      showToast('Booking details are incomplete.', 'error');
      return;
    }
    setBusy(true);
    try {
      const booking = await api.checkoutBooking(payload);
      showToast('Booking created successfully.', 'success');
      navigate(`/bookings/${booking.id}`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to complete booking.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <FullPageLoader label="Preparing booking wizard..." />;
  }

  if (!canCreate) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/bookings')}>
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You do not have permission to create bookings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
          {stepIndex === 0 ? 'Back to bookings' : 'Back'}
        </Button>
        {step !== 'stay' ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 text-sm shadow-sm">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {formatDateRange(state.checkIn, state.checkOut)}
            </span>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {guestSummary(state.adults, state.children)}
            </span>
          </div>
        ) : null}
      </div>

      <div className={cn('grid gap-6', step === 'checkout' ? 'lg:grid-cols-[1fr_320px]' : 'max-w-5xl mx-auto')}>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="font-playfair text-3xl font-bold tracking-tight">{stepTitles[step]}</h1>
            <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2">
              {stepOrder.map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    index <= stepIndex ? 'bg-gradient-to-r from-gold-400 to-gold-600' : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>

          {step === 'stay' ? (
            <Card className="mx-auto max-w-2xl border-gold-200/50 shadow-md">
              <CardContent className="pt-6">
                <form className="space-y-6" onSubmit={onStaySubmit} noValidate>
                  <SelectField
                    label="Hotel"
                    required
                    value={state.hotelId}
                    error={errors.hotelId}
                    placeholder="Select hotel"
                    options={hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))}
                    onChange={(event) => updateState('hotelId', event.target.value)}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DateField
                      label="Check-in date"
                      required
                      value={state.checkIn}
                      min={todayIso()}
                      error={errors.checkIn}
                      onChange={(event) => {
                        const checkIn = event.target.value;
                        setState((current) => {
                          const next = { ...current, checkIn };
                          if (!next.checkOut || next.checkOut <= checkIn) {
                            next.checkOut = addDaysIso(checkIn, 1);
                          }
                          return next;
                        });
                        setErrors((current) => {
                          const next = { ...current };
                          delete next.checkIn;
                          delete next.checkOut;
                          return next;
                        });
                      }}
                    />
                    <DateField
                      label="Check-out date"
                      required
                      value={state.checkOut}
                      min={minCheckOut}
                      error={errors.checkOut}
                      onChange={(event) => updateState('checkOut', event.target.value)}
                    />
                  </div>
                  <div className="space-y-3 border-t border-border pt-4">
                    <div>
                      <p className="text-sm font-semibold">Stay in room</p>
                      <p className="text-xs text-muted-foreground">Guests aged 12 or above</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <SelectField
                        label="Adults"
                        required
                        value={state.adults}
                        error={errors.adults}
                        placeholder=""
                        options={adultOptions()}
                        onChange={(event) => updateState('adults', event.target.value)}
                      />
                      <SelectField
                        label="Children"
                        value={state.children}
                        error={errors.children}
                        placeholder=""
                        options={childOptions()}
                        onChange={(event) => updateState('children', event.target.value)}
                      />
                      <SelectField
                        label="Rooms"
                        required
                        value={state.rooms}
                        error={errors.rooms}
                        placeholder=""
                        options={roomCountOptions()}
                        onChange={(event) => updateState('rooms', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="border-t border-border pt-4">
                    <Button type="submit" variant="gold" className="w-full uppercase tracking-wider" disabled={busy}>
                      {busy ? 'Searching...' : 'Check availability'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {step === 'rooms' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gold-200/60 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 text-sm dark:from-orange-950/20 dark:to-amber-950/20">
                <p className="font-semibold text-gold-700 dark:text-gold-300">Book at best price</p>
                <p className="text-muted-foreground">Direct reservations · Price match guarantee · Secure booking</p>
              </div>
              {availableRooms.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No rooms match your search. Try different dates or guest counts.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {availableRooms.map((room) => (
                    <Card key={room.roomTypeId} className="overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md">
                      <div className="relative aspect-[16/10] bg-muted">
                        {room.primaryImageUrl ? (
                          <img src={room.primaryImageUrl} alt={room.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <BedDouble className="h-10 w-10" />
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          {room.badges?.map((badge) => (
                            <Badge key={badge} variant="gold">{badge}</Badge>
                          ))}
                        </div>
                      </div>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex flex-wrap gap-2 text-muted-foreground">
                          {(room.amenities ?? []).slice(0, 4).map((amenity) => (
                            <span key={amenity} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                              <Wifi className="h-3 w-3" />
                              {amenity}
                            </span>
                          ))}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{room.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            up to {room.maxGuests} guests · {room.availableRooms} available
                          </p>
                        </div>
                        <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
                          <div>
                            {room.discountPercent ? (
                              <Badge variant="warning" className="mb-1">-{room.discountPercent}%</Badge>
                            ) : null}
                            <div className="flex items-baseline gap-2">
                              {room.originalPrice ? (
                                <span className="text-sm text-muted-foreground line-through">{formatCurrency(room.originalPrice)}</span>
                              ) : null}
                              <span className="text-xl font-bold">from {formatCurrency(room.fromPrice)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {room.totalNights} night{room.totalNights === 1 ? '' : 's'} / {guestSummary(state.adults, state.children)}
                            </p>
                          </div>
                          <Button variant="gold" disabled={busy} onClick={() => void selectRoom(room)}>
                            Select
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {step === 'rates' && state.roomTypeName ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{state.roomTypeName}</CardTitle>
                  <CardDescription>{guestSummary(state.adults, state.children)} · {Number(state.rooms)} room(s)</CardDescription>
                </CardHeader>
              </Card>
              <div className="space-y-3">
                {ratePlans.map((plan) => (
                  <Card key={plan.code} className="border-border/80">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{plan.label}</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {(plan.features ?? []).map((feature) => (
                            <li key={feature} className="flex items-center gap-2">
                              <Check className="h-3.5 w-3.5 text-gold-600" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <div className="pt-1">
                          {plan.discountPercent ? <Badge variant="warning" className="mb-1">-{plan.discountPercent}%</Badge> : null}
                          <div className="flex items-baseline gap-2">
                            {plan.originalPrice ? (
                              <span className="text-sm text-muted-foreground line-through">{formatCurrency(plan.originalPrice)}</span>
                            ) : null}
                            <span className="text-xl font-bold">{formatCurrency(plan.totalPrice)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Price for {plan.totalNights} night(s), taxes included at checkout</p>
                        </div>
                      </div>
                      <Button variant="gold" className="shrink-0" disabled={busy} onClick={() => void selectRatePlan(plan)}>
                        Select
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {step === 'checkout' ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedRoomLabel}</CardTitle>
                  <CardDescription>{state.ratePlanLabel}</CardDescription>
                </CardHeader>
              </Card>

              {upgrades.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5 text-gold-600" />
                    Room upgrade
                  </h2>
                  {upgrades.map((upgrade) => (
                    <Card key={upgrade.roomTypeId} className="overflow-hidden">
                      <CardContent className="grid gap-4 p-4 md:grid-cols-[160px_1fr_auto] md:items-center">
                        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                          {upgrade.primaryImageUrl ? (
                            <img src={upgrade.primaryImageUrl} alt={upgrade.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <BedDouble className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{upgrade.name}</h3>
                          <p className="text-sm text-muted-foreground">up to {upgrade.maxGuests} guests</p>
                          <p className="mt-2 text-sm font-medium text-gold-700">+ {formatCurrency(upgrade.upgradePrice)}</p>
                        </div>
                        <Button
                          variant={state.upgradeRoomTypeId === upgrade.roomTypeId ? 'secondary' : 'gold'}
                          disabled={busy}
                          onClick={() => void applyUpgrade(upgrade)}
                        >
                          {state.upgradeRoomTypeId === upgrade.roomTypeId ? 'Upgraded' : 'Upgrade room'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}

              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Extra services</h2>
                {extraServices.map((service) => {
                  const selected = state.extraServiceIds.includes(service.id);
                  return (
                    <Card key={service.id} className={cn(selected && 'border-gold-400/60 bg-gold-50/30 dark:bg-gold-950/10')}>
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                          <p className="mt-2 text-sm font-medium">
                            {service.free ? 'Free of charge' : formatCurrency(service.price)}
                          </p>
                        </div>
                        <Button
                          variant={selected ? 'secondary' : 'gold'}
                          disabled={busy}
                          onClick={() => void toggleExtraService(service.id)}
                        >
                          {selected ? (
                            <>
                              <Check className="h-4 w-4" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Guest details</CardTitle>
                  <CardDescription>Email or phone is required to confirm the booking.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4 md:grid-cols-2" onSubmit={onCheckoutSubmit} noValidate>
                    <TextField
                      label="Guest name"
                      required
                      value={state.guestName}
                      error={errors.guestName}
                      onChange={(event) => updateState('guestName', event.target.value)}
                    />
                    <TextField
                      label="Guest email"
                      type="email"
                      value={state.guestEmail}
                      error={errors.guestEmail}
                      onChange={(event) => {
                        updateState('guestEmail', event.target.value);
                        setErrors((current) => {
                          const next = { ...current };
                          delete next.guestPhone;
                          return next;
                        });
                      }}
                    />
                    <TextField
                      label="Guest phone"
                      type="tel"
                      value={state.guestPhone}
                      error={errors.guestPhone}
                      onChange={(event) => {
                        updateState('guestPhone', event.target.value);
                        setErrors((current) => {
                          const next = { ...current };
                          delete next.guestEmail;
                          return next;
                        });
                      }}
                    />
                    <TextField
                      label="Notes"
                      wrapperClassName="md:col-span-2"
                      value={state.notes}
                      onChange={(event) => updateState('notes', event.target.value)}
                    />
                    <div className="md:col-span-2 lg:hidden">
                      <Button type="submit" variant="gold" className="w-full uppercase tracking-wide" disabled={busy}>
                        {busy ? 'Completing...' : 'Complete booking'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        {step === 'checkout' ? (
          <BookingSummarySidebar
            quote={quote}
            loading={busy}
            roomLabel={selectedRoomLabel}
            onContinue={() => {
              const form = document.querySelector<HTMLFormElement>('form');
              form?.requestSubmit();
            }}
            continueLabel={busy ? 'Completing...' : 'Complete booking'}
            disabled={busy}
          />
        ) : null}
      </div>

      {step === 'checkout' ? null : (
        <p className="text-center text-xs text-muted-foreground">
          Need the simple form? <Link to="/bookings/new/simple" className="font-medium text-gold-700 underline">Use quick booking</Link>
        </p>
      )}
    </div>
  );
}
