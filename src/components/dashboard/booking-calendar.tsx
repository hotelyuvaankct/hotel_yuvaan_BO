import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  BedDouble,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardCalendar, DashboardCalendarEvent } from '@/lib/api-types';
import { bookingSourceOptions, bookingStatusOptions, optionLabel } from '@/lib/enums';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingOverlay } from '@/components/dashboard/charts';
import { cn } from '@/lib/utils';

type CalendarView = 'month' | 'week' | 'day';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_AGENDA_LENGTH = 5;

const selectClass =
  'h-9 rounded-lg border border-input bg-background px-2 text-sm font-medium outline-none transition-colors hover:border-ring/40 focus:ring-2 focus:ring-ring/60 [color-scheme:light] dark:[color-scheme:dark]';

function yearRange() {
  const current = new Date().getFullYear();
  return Array.from({ length: 9 }, (_, i) => current - 4 + i);
}

const STATUS_DOT: Record<number, string> = {
  1: 'bg-slate-400',
  2: 'bg-amber-400',
  3: 'bg-emerald-500',
  4: 'bg-sky-500',
  5: 'bg-violet-500',
  6: 'bg-rose-500',
  7: 'bg-red-600',
  8: 'bg-zinc-400',
};

function statusVariant(status: number) {
  if (status === 3) return 'success' as const;
  if (status === 4 || status === 5) return 'gold' as const;
  if (status === 1 || status === 2) return 'warning' as const;
  return 'secondary' as const;
}

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
    <Card>
      <CardHeader className="flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Booking calendar</CardTitle>
          <CardDescription>Every active booking across its stay window.</CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
          <div className="inline-flex w-full rounded-xl border border-border bg-muted/30 p-1 sm:w-auto">
            {(['month', 'week', 'day'] as CalendarView[]).map((value) => (
              <button
                key={value}
                type="button"
                className={cn(
                  'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all sm:flex-none',
                  view === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setView(value)}
              >
                {value}
              </button>
            ))}
          </div>

          {/* Period selectors (own row on mobile so the month name has room) */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {view === 'month' ? (
              <>
                <select
                  className={cn(selectClass, 'min-w-0 flex-1 sm:w-[130px] sm:flex-none')}
                  value={cursor.getMonth()}
                  onChange={(e) => setCursor(new Date(cursor.getFullYear(), Number(e.target.value), 1))}
                  aria-label="Select month"
                >
                  {MONTHS.map((label, index) => (
                    <option key={label} value={index}>{label}</option>
                  ))}
                </select>
                <select
                  className={cn(selectClass, 'w-[90px] shrink-0')}
                  value={cursor.getFullYear()}
                  onChange={(e) => setCursor(new Date(Number(e.target.value), cursor.getMonth(), 1))}
                  aria-label="Select year"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </>
            ) : null}

            {view === 'week' ? (
              <>
                <select
                  className={cn(selectClass, 'min-w-0 flex-1 sm:w-[200px] sm:flex-none')}
                  value={weekInfo.weekNo}
                  onChange={(e) => {
                    const target = weekOptions.find((w) => w.weekNo === Number(e.target.value));
                    if (target) setCursor(target.start);
                  }}
                  aria-label="Select week"
                >
                  {weekOptions.map((week) => {
                    const end = addDays(week.start, 6);
                    const range = `${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(week.start)} – ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(end)}`;
                    return (
                      <option key={week.weekNo} value={week.weekNo}>
                        Week {week.weekNo} · {range}
                      </option>
                    );
                  })}
                </select>
                <select
                  className={cn(selectClass, 'w-[90px] shrink-0')}
                  value={weekInfo.year}
                  onChange={(e) => {
                    const nextYear = Number(e.target.value);
                    const weeks = weeksOfYear(nextYear);
                    const target = weeks[Math.min(weekInfo.weekNo - 1, weeks.length - 1)];
                    if (target) setCursor(target.start);
                  }}
                  aria-label="Select year"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </>
            ) : null}

            {view === 'day' ? (
              <input
                type="date"
                className={cn(selectClass, 'min-w-0 flex-1 px-3 sm:w-[180px] sm:flex-none')}
                value={toDateKey(cursor)}
                onChange={(e) => {
                  if (e.target.value) setCursor(new Date(`${e.target.value}T00:00:00`));
                }}
                aria-label="Select start date"
              />
            ) : null}
          </div>

          {/* Navigation */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="outline" size="icon" className="shrink-0" disabled={loading} onClick={() => shift(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="shrink-0" disabled={loading} onClick={() => shift(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={loading} onClick={() => setCursor(new Date())}>
              Today
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <StatusLegend />
          <p className="text-xs text-muted-foreground">{calendar?.totalEvents ?? 0} booking(s) in view</p>
        </div>
      </CardContent>

      {selectedDay
        ? createPortal(
            <DayDetailModal
              dayKey={selectedDay}
              events={eventsForSelectedDay}
              onClose={() => setSelectedDay(null)}
            />,
            document.body,
          )
        : null}
    </Card>
  );
}

function EventPill({ event }: { event: DashboardCalendarEvent }) {
  return (
    <span className="flex items-center gap-1.5 truncate rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px]">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[event.bookingStatus] ?? 'bg-slate-400')} />
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
            ? 'bg-gold-500/10'
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
            {isToday ? <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gold-500" /> : null}
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
                  className={cn('h-2 w-2 rounded-full', STATUS_DOT[event.bookingStatus] ?? 'bg-slate-400')}
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
      <div className={cn('flex items-center justify-between border-b border-border px-4 py-2.5', highlight ? 'bg-gold-500/10' : 'bg-muted/40')}>
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

function EventRow({ event }: { event: DashboardCalendarEvent }) {
  const money = formatMoney(event.totalAmount);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT[event.bookingStatus] ?? 'bg-slate-400')} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {event.guestName} <span className="font-normal text-muted-foreground">· {event.bookingCode}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">{event.hotelName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {formatStayDate(event.checkIn)} → {formatStayDate(event.checkOut)}
            </span>
            {event.totalRooms ? (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="h-3 w-3" />
                {event.totalRooms} room{event.totalRooms === 1 ? '' : 's'}
              </span>
            ) : null}
            {event.totalGuests ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.totalGuests} guest{event.totalGuests === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <Badge variant={statusVariant(event.bookingStatus)}>
            {optionLabel(bookingStatusOptions, event.bookingStatus)}
          </Badge>
          {money ? <p className="mt-1 text-sm font-semibold">{money}</p> : null}
          <p className="text-[10px] text-muted-foreground">{optionLabel(bookingSourceOptions, event.source)}</p>
        </div>
        <Link
          to={`/bookings/${event.bookingId}`}
          className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
        >
          View
        </Link>
      </div>
    </li>
  );
}

function DayDetailModal({
  dayKey,
  events,
  onClose,
}: {
  dayKey: string;
  events: DashboardCalendarEvent[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dayKey}T00:00:00`));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Bookings on ${dayLabel}`}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card text-card-foreground shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">{dayLabel}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {events.length} booking{events.length === 1 ? '' : 's'} on this day
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">No bookings on this day.</p>
          ) : (
            <ul className="divide-y divide-border">
              {events.map((event) => (
                <EventRow key={event.bookingId} event={event} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={cn('h-2 w-2 rounded-full', item.dot)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
