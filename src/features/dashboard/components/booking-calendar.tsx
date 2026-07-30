import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardCalendar, DashboardCalendarEvent } from '@/lib/api-types';
import { bookingSourceOptions, bookingStatusOptions, bookingStatusTone, optionLabel } from '@/lib/enums';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/form-fields';
import { LoadingOverlay } from '@/features/dashboard/components/charts';
import { cn } from '@/lib/utils';

type CalendarView = 'month' | 'week' | 'day';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
];

const DAY_AGENDA_LENGTH = 5;

function yearRange() {
  const current = new Date().getFullYear();
  return Array.from({ length: 9 }, (_, i) => current - 4 + i);
}

const STATUS_DOT: Record<number, string> = {
  1: 'bg-muted-foreground',
  2: 'bg-muted-foreground',
  3: 'bg-brand',
  4: 'bg-brand-muted',
  5: 'bg-gold',
  6: 'bg-destructive',
  7: 'bg-destructive',
  8: 'bg-muted-foreground',
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Sunday-based weeks; a week "belongs" to the year of its Wednesday (midpoint).
function weekOwnerYear(weekStart: Date) {
  return addDays(weekStart, 3).getFullYear();
}

function weeksOfYear(year: number) {
  let start = startOfWeek(new Date(year, 0, 1));
  while (weekOwnerYear(start) < year) start = addDays(start, 7);
  while (weekOwnerYear(addDays(start, -7)) === year) start = addDays(start, -7);
  const weeks: { weekNo: number; start: Date }[] = [];
  let i = 1;
  while (weekOwnerYear(start) === year) {
    weeks.push({ weekNo: i, start: new Date(start) });
    start = addDays(start, 7);
    i += 1;
  }
  return weeks;
}

function weekNumberOf(date: Date) {
  const start = startOfWeek(date);
  const year = weekOwnerYear(start);
  const key = toDateKey(start);
  const found = weeksOfYear(year).find((w) => toDateKey(w.start) === key);
  return { year, weekNo: found ? found.weekNo : 1 };
}

function formatMoney(value?: number) {
  if (value == null) return null;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatStayDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

export function BookingCalendar({ canRead }: { canRead: boolean }) {
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [calendar, setCalendar] = useState<DashboardCalendar | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const visibleDays = useMemo(() => {
    if (view === 'day') {
      const start = startOfDay(cursor);
      return Array.from({ length: DAY_AGENDA_LENGTH }, (_, i) => addDays(start, i));
    }
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const monthStart = startOfMonth(cursor);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor, view]);

  const loadCalendar = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const from = toDateKey(visibleDays[0]);
      const to = toDateKey(visibleDays[visibleDays.length - 1]);
      setCalendar(await api.getDashboardCalendar({ from, to }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load calendar.');
    } finally {
      setLoading(false);
    }
  }, [canRead, visibleDays]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DashboardCalendarEvent[]>();
    (calendar?.events ?? []).forEach((event) => {
      const start = new Date(`${event.checkIn}T00:00:00`);
      const end = new Date(`${event.checkOut}T00:00:00`);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d);
        const list = map.get(key) ?? [];
        list.push(event);
        map.set(key, list);
      }
    });
    return map;
  }, [calendar]);

  const eventsForSelectedDay = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  function shift(direction: -1 | 1) {
    setCursor((current) => {
      if (view === 'day') return addDays(current, direction * DAY_AGENDA_LENGTH);
      if (view === 'week') return addDays(current, direction * 7);
      return new Date(current.getFullYear(), current.getMonth() + direction, 1);
    });
  }

  const weekInfo = useMemo(() => weekNumberOf(cursor), [cursor]);
  const weekOptions = useMemo(() => weeksOfYear(weekInfo.year), [weekInfo.year]);
  const years = useMemo(() => yearRange(), []);
  const todayKey = toDateKey(new Date());

  if (!canRead) return null;

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Booking calendar</h2>
          <p className="text-sm text-muted-foreground">Every active booking across its stay window.</p>
        </div>
        <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
            <SelectField
              variant="filter"
              label="View"
              wrapperClassName="min-w-0 col-span-2 sm:col-auto sm:min-w-[120px]"
              value={view}
              onChange={(event) => setView(event.target.value as CalendarView)}
              options={VIEW_OPTIONS}
            />

            {view === 'month' ? (
              <>
                <SelectField
                  variant="filter"
                  label="Month"
                  wrapperClassName="min-w-0 sm:min-w-[140px]"
                  value={cursor.getMonth()}
                  onChange={(event) =>
                    setCursor(new Date(cursor.getFullYear(), Number(event.target.value), 1))
                  }
                  options={MONTHS.map((label, index) => ({ value: index, label }))}
                />
                <SelectField
                  variant="filter"
                  label="Year"
                  wrapperClassName="min-w-0 sm:min-w-[100px]"
                  value={cursor.getFullYear()}
                  onChange={(event) =>
                    setCursor(new Date(Number(event.target.value), cursor.getMonth(), 1))
                  }
                  options={years.map((year) => ({ value: year, label: String(year) }))}
                />
              </>
            ) : null}

            {view === 'week' ? (
              <>
                <SelectField
                  variant="filter"
                  label="Week"
                  wrapperClassName="min-w-0 col-span-2 sm:col-auto sm:min-w-[240px]"
                  value={weekInfo.weekNo}
                  onChange={(event) => {
                    const target = weekOptions.find((w) => w.weekNo === Number(event.target.value));
                    if (target) setCursor(target.start);
                  }}
                  options={weekOptions.map((week) => {
                    const end = addDays(week.start, 6);
                    const range = `${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(week.start)} – ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(end)}`;
                    return {
                      value: week.weekNo,
                      label: `Week ${week.weekNo} · ${range}`,
                    };
                  })}
                />
                <SelectField
                  variant="filter"
                  label="Year"
                  wrapperClassName="min-w-0 col-span-2 sm:col-auto sm:min-w-[100px]"
                  value={weekInfo.year}
                  onChange={(event) => {
                    const nextYear = Number(event.target.value);
                    const weeks = weeksOfYear(nextYear);
                    const target = weeks[Math.min(weekInfo.weekNo - 1, weeks.length - 1)];
                    if (target) setCursor(target.start);
                  }}
                  options={years.map((year) => ({ value: year, label: String(year) }))}
                />
              </>
            ) : null}

            {view === 'day' ? (
              <TextField
                label="Date"
                type="date"
                wrapperClassName="min-w-0 col-span-2 sm:col-auto sm:min-w-[180px]"
                className="[color-scheme:light] dark:[color-scheme:dark]"
                value={toDateKey(cursor)}
                onChange={(event) => {
                  if (event.target.value) setCursor(new Date(`${event.target.value}T00:00:00`));
                }}
              />
            ) : null}

            <div className="col-span-2 flex items-end gap-2 sm:col-auto">
              <Button variant="outline" size="icon" className="shrink-0" disabled={loading} onClick={() => shift(-1)} aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="shrink-0" disabled={loading} onClick={() => shift(1)} aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-10 min-w-0 flex-1 sm:flex-none" disabled={loading} onClick={() => setCursor(new Date())}>
                Today
              </Button>
            </div>
        </div>
      </div>

      <div>
        {error ? (
          <div className="mb-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="relative">
          <LoadingOverlay show={loading} />

          {view === 'month' ? (
            <MonthGrid
              days={visibleDays}
              cursorMonth={cursor.getMonth()}
              todayKey={todayKey}
              eventsByDay={eventsByDay}
              onSelectDay={setSelectedDay}
            />
          ) : null}

          {view === 'week' ? (
            <WeekGrid
              days={visibleDays}
              todayKey={todayKey}
              eventsByDay={eventsByDay}
              onSelectDay={setSelectedDay}
            />
          ) : null}

          {view === 'day' ? (
            <div className="space-y-3">
              {visibleDays.map((day) => (
                <DayList
                  key={toDateKey(day)}
                  day={day}
                  events={eventsByDay.get(toDateKey(day)) ?? []}
                  highlight={toDateKey(day) === todayKey}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <StatusLegend />
          <p className="shrink-0 text-xs text-muted-foreground">
            {calendar?.totalEvents ?? 0} booking(s) in view
          </p>
        </div>
      </div>

      {selectedDay ? (
        <DayDetailSheet
          dayKey={selectedDay}
          events={eventsForSelectedDay}
          onClose={() => setSelectedDay(null)}
        />
      ) : null}
    </section>
  );
}

function EventPill({ event }: { event: DashboardCalendarEvent }) {
  return (
    <span className="flex items-center gap-1.5 truncate rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px]">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[event.bookingStatus] ?? 'bg-muted-foreground')} />
      <span className="truncate">{event.guestName}</span>
    </span>
  );
}

function MonthGrid({
  days,
  cursorMonth,
  todayKey,
  eventsByDay,
  onSelectDay,
}: {
  days: Date[];
  cursorMonth: number;
  todayKey: string;
  eventsByDay: Map<string, DashboardCalendarEvent[]>;
  onSelectDay: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border text-sm">
      {WEEK_DAYS.map((day, index) => (
        <div
          key={day}
          className={cn(
            'bg-muted/60 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
            (index === 0 || index === 6) && 'text-foreground/70',
          )}
        >
          {day}
        </div>
      ))}
      {days.map((day) => {
        const key = toDateKey(day);
        const dayEvents = eventsByDay.get(key) ?? [];
        const inMonth = day.getMonth() === cursorMonth;
        const isToday = key === todayKey;
        const baseBg = !inMonth
          ? 'bg-muted/40 text-muted-foreground/50'
          : isToday
            ? 'bg-gold/10'
            : 'bg-background';
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDay(key)}
            className={cn(
              'group/cell relative flex min-h-[68px] flex-col gap-1 p-1.5 text-left align-top outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 sm:min-h-[112px]',
              baseBg,
              isToday && 'z-10 ring-1 ring-inset ring-gold-500/50',
            )}
          >
            {isToday ? <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gold" /> : null}
            <span
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs',
                isToday ? 'bg-gold-600 font-semibold text-white' : 'font-medium',
              )}
            >
              {day.getDate()}
            </span>

            {/* Compact dot strip on small screens */}
            <div className="flex flex-wrap items-center gap-1 sm:hidden">
              {dayEvents.slice(0, 4).map((event) => (
                <span
                  key={`${key}-dot-${event.bookingId}`}
                  className={cn('h-2 w-2 rounded-full', STATUS_DOT[event.bookingStatus] ?? 'bg-muted-foreground')}
                />
              ))}
              {dayEvents.length > 4 ? (
                <span className="text-[10px] font-semibold leading-none text-muted-foreground">
                  +{dayEvents.length - 4}
                </span>
              ) : null}
            </div>

            {/* Full name pills on larger screens */}
            <div className="hidden space-y-1 sm:block">
              {dayEvents.slice(0, 3).map((event) => (
                <EventPill key={`${key}-${event.bookingId}`} event={event} />
              ))}
              {dayEvents.length > 3 ? (
                <span className="block whitespace-nowrap px-1 text-[10px] font-medium text-gold-700 dark:text-gold-300">
                  +{dayEvents.length - 3} more
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({
  days,
  todayKey,
  eventsByDay,
  onSelectDay,
}: {
  days: Date[];
  todayKey: string;
  eventsByDay: Map<string, DashboardCalendarEvent[]>;
  onSelectDay: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-7">
      {days.map((day) => {
        const key = toDateKey(day);
        const dayEvents = eventsByDay.get(key) ?? [];
        const isToday = key === todayKey;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDay(key)}
            className="flex min-h-[180px] flex-col bg-background p-2 text-left transition-colors hover:bg-muted/40"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(day)}
              </span>
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  isToday && 'bg-gold-600 font-semibold text-white',
                )}
              >
                {day.getDate()}
              </span>
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 6).map((event) => (
                <EventPill key={`${key}-${event.bookingId}`} event={event} />
              ))}
              {dayEvents.length > 6 ? (
                <span className="block px-1.5 text-[10px] font-medium text-gold-700 dark:text-gold-300">
                  +{dayEvents.length - 6} more
                </span>
              ) : null}
              {dayEvents.length === 0 ? (
                <span className="px-1.5 text-[10px] text-muted-foreground">No bookings</span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayList({
  day,
  events,
  highlight,
}: {
  day: Date;
  events: DashboardCalendarEvent[];
  highlight?: boolean;
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border', highlight && 'border-gold-500/60 ring-1 ring-gold-500/30')}>
      <div className={cn('flex items-center justify-between border-b border-border px-4 py-2.5', highlight ? 'bg-gold/10' : 'bg-muted/40')}>
        <span className="flex items-center gap-2 text-sm font-semibold">
          {new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(day)}
          {highlight ? (
            <span className="rounded-full bg-gold-600 px-2 py-0.5 text-[10px] font-semibold text-white">Today</span>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">{events.length} booking{events.length === 1 ? '' : 's'}</span>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-4 text-center text-xs text-muted-foreground">No bookings.</p>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((event) => (
            <EventRow key={event.bookingId} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({
  event,
  layout = 'list',
}: {
  event: DashboardCalendarEvent;
  layout?: 'list' | 'tile';
}) {
  const money = formatMoney(event.totalAmount);
  const status = optionLabel(bookingStatusOptions, event.bookingStatus);
  const source = optionLabel(bookingSourceOptions, event.source);
  const isTile = layout === 'tile';

  return (
    <li className={cn('min-w-0', !isTile && 'sm:px-4 sm:py-3')}>
      <article
        className={cn(
          'min-w-0 space-y-2.5',
          isTile
            ? 'h-full rounded-xl border border-border bg-card p-3.5 shadow-sm'
            : 'rounded-xl border border-border bg-card p-3 shadow-sm sm:space-y-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none',
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
              STATUS_DOT[event.bookingStatus] ?? 'bg-muted-foreground',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{event.guestName}</p>
                <p className="truncate text-xs text-muted-foreground">{event.bookingCode}</p>
              </div>
              <Badge
                tone={bookingStatusTone(event.bookingStatus)}
                className={cn(
                  'shrink-0',
                  (event.bookingStatus === 3 || event.bookingStatus === 4) &&
                    'bg-brand text-brand-foreground',
                )}
              >
                {status}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.hotelName}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 pl-5 text-[11px] text-muted-foreground">
          <span className="inline-flex min-w-0 max-w-full items-center gap-1">
            <CalendarClock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {formatStayDate(event.checkIn)} → {formatStayDate(event.checkOut)}
            </span>
          </span>
          {event.totalRooms ? (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3 w-3 shrink-0" />
              {event.totalRooms} room{event.totalRooms === 1 ? '' : 's'}
            </span>
          ) : null}
          {event.totalGuests ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0" />
              {event.totalGuests} guest{event.totalGuests === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            'flex items-center justify-between gap-2 pl-5',
            isTile ? 'border-t border-border/60 pt-2.5' : 'border-t border-border/60 pt-2.5 sm:border-0 sm:pt-1',
          )}
        >
          <div className="min-w-0">
            {money ? <p className="text-sm font-semibold text-foreground">{money}</p> : null}
            <p className="text-[10px] text-muted-foreground">{source}</p>
          </div>
          <Link
            to={`/bookings/${event.bookingId}`}
            aria-label={`View booking ${event.bookingCode}`}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        </div>
      </article>
    </li>
  );
}

function DayDetailSheet({
  dayKey,
  events,
  onClose,
}: {
  dayKey: string;
  events: DashboardCalendarEvent[];
  onClose: () => void;
}) {
  const dayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dayKey}T00:00:00`));

  const shortDayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dayKey}T00:00:00`));

  return (
    <BottomSheet isOpen onClose={onClose} maxHeight="90dvh" className="sm:max-w-4xl lg:max-w-5xl">
      <BottomSheet.Header title={shortDayLabel} />
      <BottomSheet.Body className="space-y-3 px-3 py-3 sm:px-5 sm:py-4">
        <p className="text-xs text-muted-foreground sm:text-sm">
          <span className="hidden sm:inline">{dayLabel} · </span>
          {events.length} booking{events.length === 1 ? '' : 's'} on this day
        </p>
        {events.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No bookings on this day.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {events.map((event) => (
              <EventRow key={event.bookingId} event={event} layout="tile" />
            ))}
          </ul>
        )}
      </BottomSheet.Body>
    </BottomSheet>
  );
}

function StatusLegend() {
  const items = [
    { label: 'Confirmed', dot: STATUS_DOT[3] },
    { label: 'Checked in', dot: STATUS_DOT[4] },
    { label: 'Checked out', dot: STATUS_DOT[5] },
    { label: 'Pending', dot: STATUS_DOT[2] },
    { label: 'Cancelled', dot: STATUS_DOT[6] },
  ];
  return (
    <div className="w-full min-w-0 max-w-full space-y-1.5">
      <p className="text-sm font-medium text-foreground">Status</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {items.map((item) => (
          <span key={item.label} className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', item.dot)} />
            <span className="whitespace-nowrap">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
