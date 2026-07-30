import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BedDouble, ChevronDown, ChevronRight, Grip, Lock, Tag, Users } from 'lucide-react';
import type { InventoryDayCell, InventoryRoomTypeRow } from '@/lib/api-types';
import { cn } from '@/lib/utils';
import {
  InventoryEditPopover,
  type InventoryEditKind,
} from '@/features/inventory/components/inventory-edit-popover';

const LABEL_WIDTH_DESKTOP = 248;
const LABEL_WIDTH_MOBILE = 168;
const COL_WIDTH = 80;

/** Sticky left label column — solid bg + edge so horizontal scroll keeps labels pinned.
 *  Keep z-index below layout chrome (sidebar z-50 / overlay z-40 / header z-30).
 */
const stickyLabelClass =
  'sticky left-0 z-10 border-r border-border bg-card shadow-[2px_0_0_0_hsl(var(--border))]';
const stickyLabelHeaderClass =
  'sticky left-0 top-0 z-20 border-b border-r border-border bg-muted shadow-[2px_0_0_0_hsl(var(--border))]';
const stickyDateHeaderClass =
  'sticky top-0 z-10 border-b border-r border-border';

function useLabelWidth() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
      ? LABEL_WIDTH_DESKTOP
      : LABEL_WIDTH_MOBILE,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setWidth(mq.matches ? LABEL_WIDTH_DESKTOP : LABEL_WIDTH_MOBILE);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return width;
}

export type InventorySelection = {
  roomTypeId: number;
  rowKey: string;
  kind: InventoryEditKind;
  ratePlanCode?: string;
  guestCount?: number;
  startDate: string;
  endDate: string;
};

type Props = {
  roomTypes: InventoryRoomTypeRow[];
  dates: string[];
  canUpdate: boolean;
  collapsed: Record<number, boolean>;
  onToggleCollapse: (roomTypeId: number) => void;
  onSaveAvailability: (payload: {
    roomTypeId: number;
    fromDate: string;
    toDate: string;
    availableRooms: number;
  }) => Promise<void>;
  onSaveRate: (payload: {
    roomTypeId: number;
    ratePlanCode: string;
    guestCount: number;
    fromDate: string;
    toDate: string;
    price: number;
  }) => Promise<void>;
};

function weekdayMeta(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = date.getDay();
  return {
    weekday,
    dayName: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
    dayNum: new Intl.DateTimeFormat('en-GB', { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date),
    isSaturday: weekday === 6,
    isSunday: weekday === 0,
  };
}

function dayByDate(row: InventoryRoomTypeRow, date: string): InventoryDayCell | undefined {
  return row.days.find((day) => day.date === date);
}

function occupancyDisplay(day: InventoryDayCell | undefined, ratePlanCode: string, guestCount: number) {
  const cell = day?.ratePlans?.find((item) => item.ratePlanCode === ratePlanCode);
  const occupancy = cell?.occupancyPrices?.find((item) => item.guestCount === guestCount);
  if (occupancy?.absolutePrice != null) return String(occupancy.absolutePrice);
  if (occupancy?.effectivePrice != null) return String(occupancy.effectivePrice);
  if (cell?.absolutePrice != null) return String(cell.absolutePrice);
  if (cell?.effectivePrice != null) return String(cell.effectivePrice);
  return '—';
}

/** Sell price shown in collapsed room-type summary (prefers editable occupancy rate, not DB room base). */
function collapsedSellPrice(roomType: InventoryRoomTypeRow, day: InventoryDayCell | undefined): string | null {
  const plans = roomType.ratePlans ?? [];
  const preferred =
    plans.find((plan) => plan.code === 'ROOM_ONLY') ??
    plans[0];
  if (!preferred) {
    return day?.price != null ? String(day.price) : null;
  }
  const guests = guestCountsFor(roomType, preferred.guestCounts);
  const guestCount = guests.includes(1) ? 1 : guests[0];
  if (guestCount == null) {
    return day?.price != null ? String(day.price) : null;
  }
  const display = occupancyDisplay(day, preferred.code, guestCount);
  if (display !== '—') return display;
  return day?.price != null ? String(day.price) : null;
}

function guestCountsFor(roomType: InventoryRoomTypeRow, planGuestCounts?: number[]) {
  if (planGuestCounts && planGuestCounts.length > 0) {
    return [...planGuestCounts].sort((a, b) => a - b);
  }
  const maxGuests = Math.max(roomType.maxGuests ?? 1, 1);
  return Array.from({ length: maxGuests }, (_, index) => index + 1);
}

function orderedRange(a: string, b: string) {
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

function datesInRange(dates: string[], start: string, end: string) {
  return dates.filter((date) => date >= start && date <= end);
}

function parseCellKey(key: string): { roomTypeId: number; rowKey: string; date: string } | null {
  const first = key.indexOf('|');
  const last = key.lastIndexOf('|');
  if (first <= 0 || last <= first) return null;
  const roomTypeId = Number(key.slice(0, first));
  if (!Number.isFinite(roomTypeId)) return null;
  return {
    roomTypeId,
    rowKey: key.slice(first + 1, last),
    date: key.slice(last + 1),
  };
}

export function InventoryCalendarGrid({
  roomTypes,
  dates,
  canUpdate,
  collapsed,
  onToggleCollapse,
  onSaveAvailability,
  onSaveRate,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelWidth = useLabelWidth();
  const [selection, setSelection] = useState<InventorySelection | null>(null);
  const [dragging, setDragging] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const dragOrigin = useRef<{ roomTypeId: number; rowKey: string; date: string } | null>(null);
  const selectionRef = useRef<InventorySelection | null>(null);
  const draggingRef = useRef(false);
  const labelWidthRef = useRef(labelWidth);

  selectionRef.current = selection;
  draggingRef.current = dragging;
  labelWidthRef.current = labelWidth;

  const selectedSet = useMemo(() => {
    if (!selection) return new Set<string>();
    const keys = new Set<string>();
    for (const date of datesInRange(dates, selection.startDate, selection.endDate)) {
      keys.add(`${selection.roomTypeId}|${selection.rowKey}|${date}`);
    }
    return keys;
  }, [dates, selection]);

  function measureSelection(next: InventorySelection | null) {
    if (!next || !rootRef.current) {
      setAnchorRect(null);
      setContainerRect(null);
      setChromeVisible(false);
      return;
    }
    const root = rootRef.current;
    const container = root.getBoundingClientRect();
    const startEl = root.querySelector(
      `[data-cell="${next.roomTypeId}|${next.rowKey}|${next.startDate}"]`,
    ) as HTMLElement | null;
    const endEl = root.querySelector(
      `[data-cell="${next.roomTypeId}|${next.rowKey}|${next.endDate}"]`,
    ) as HTMLElement | null;
    if (!startEl || !endEl) {
      setAnchorRect(null);
      setContainerRect(container);
      setChromeVisible(false);
      return;
    }
    const start = startEl.getBoundingClientRect();
    const end = endEl.getBoundingClientRect();
    const rawLeft = Math.min(start.left, end.left) - container.left;
    const rawTop = Math.min(start.top, end.top) - container.top;
    const rawWidth = Math.abs(end.right - start.left);
    const rawHeight = Math.max(start.height, end.height);

    // Clip under the sticky Rooms & rates column so chrome doesn't float over labels.
    const clipLeft = labelWidthRef.current;
    const clippedLeft = Math.max(rawLeft, clipLeft);
    const clippedWidth = Math.max(0, rawLeft + rawWidth - clippedLeft);
    const visible = clippedWidth >= 8;

    setContainerRect(container);
    setChromeVisible(visible);
    setAnchorRect(
      visible
        ? new DOMRect(clippedLeft + container.left, rawTop + container.top, clippedWidth, rawHeight)
        : new DOMRect(
            Math.min(start.left, end.left),
            Math.min(start.top, end.top),
            rawWidth,
            rawHeight,
          ),
    );
  }

  useEffect(() => {
    if (!selection) {
      setChromeVisible(false);
      return;
    }
    measureSelection(selection);

    let frame = 0;
    function onReposition() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measureSelection(selectionRef.current));
    }

    const scrollParent = rootRef.current?.closest('.overflow-auto, .overflow-x-auto, .overflow-y-auto');
    window.addEventListener('resize', onReposition);
    scrollParent?.addEventListener('scroll', onReposition, { passive: true });
    document.addEventListener('scroll', onReposition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onReposition);
      scrollParent?.removeEventListener('scroll', onReposition);
      document.removeEventListener('scroll', onReposition, true);
    };
  }, [selection, dragging, dates, collapsed, labelWidth]);

  useEffect(() => {
    function onPointerUp() {
      if (!draggingRef.current) return;
      setDragging(false);
      dragOrigin.current = null;
      const current = selectionRef.current;
      if (current) {
        requestAnimationFrame(() => measureSelection(current));
      }
    }
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  // Touch / pointer drag: pointerenter does not fire across cells on mobile.
  useEffect(() => {
    if (!dragging) return;

    function onPointerMove(event: PointerEvent) {
      if (!draggingRef.current || !dragOrigin.current) return;
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const cell = hit?.closest('[data-cell]') as HTMLElement | null;
      const parsed = cell?.dataset.cell ? parseCellKey(cell.dataset.cell) : null;
      if (!parsed) return;
      extendSelect(parsed.roomTypeId, parsed.rowKey, parsed.date);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [dragging]);

  function beginSelect(
    roomTypeId: number,
    rowKey: string,
    kind: InventoryEditKind,
    date: string,
    ratePlanCode?: string,
    guestCount?: number,
  ) {
    if (!canUpdate) return;

    const existing = selectionRef.current;
    if (
      existing &&
      existing.roomTypeId === roomTypeId &&
      existing.rowKey === rowKey &&
      existing.kind === kind
    ) {
      const startIdx = dates.indexOf(existing.startDate);
      const endIdx = dates.indexOf(existing.endDate);
      const clickIdx = dates.indexOf(date);
      if (startIdx >= 0 && endIdx >= 0 && clickIdx >= 0) {
        const mid = (startIdx + endIdx) / 2;
        const originDate = clickIdx <= mid ? existing.endDate : existing.startDate;
        dragOrigin.current = { roomTypeId, rowKey, date: originDate };
        setDragging(true);
        const range = orderedRange(originDate, date);
        const next: InventorySelection = {
          ...existing,
          startDate: range.start,
          endDate: range.end,
        };
        setSelection(next);
        requestAnimationFrame(() => measureSelection(next));
        return;
      }
    }

    dragOrigin.current = { roomTypeId, rowKey, date };
    setDragging(true);
    const next: InventorySelection = {
      roomTypeId,
      rowKey,
      kind,
      ratePlanCode,
      guestCount,
      startDate: date,
      endDate: date,
    };
    setSelection(next);
    requestAnimationFrame(() => measureSelection(next));
  }

  function resizeFromEdge(edge: 'start' | 'end') {
    const current = selectionRef.current;
    if (!current || !canUpdate) return;
    const originDate = edge === 'start' ? current.endDate : current.startDate;
    dragOrigin.current = {
      roomTypeId: current.roomTypeId,
      rowKey: current.rowKey,
      date: originDate,
    };
    setDragging(true);
  }

  function extendSelect(roomTypeId: number, rowKey: string, date: string) {
    if (!draggingRef.current || !dragOrigin.current) return;
    if (dragOrigin.current.roomTypeId !== roomTypeId || dragOrigin.current.rowKey !== rowKey) return;
    const range = orderedRange(dragOrigin.current.date, date);
    setSelection((current) => {
      if (!current) return current;
      if (current.startDate === range.start && current.endDate === range.end) return current;
      const next = {
        ...current,
        startDate: range.start,
        endDate: range.end,
      };
      requestAnimationFrame(() => measureSelection(next));
      return next;
    });
  }

  function clearSelection() {
    setSelection(null);
    setAnchorRect(null);
    setChromeVisible(false);
    setDragging(false);
    dragOrigin.current = null;
  }

  function seedValue(next: InventorySelection) {
    const row = roomTypes.find((item) => item.roomTypeId === next.roomTypeId);
    const day = row ? dayByDate(row, next.startDate) : undefined;
    if (next.kind === 'availability') {
      return String(day?.totalInventory ?? 0);
    }
    if (!next.ratePlanCode || next.guestCount == null) return '';
    return occupancyDisplay(day, next.ratePlanCode, next.guestCount).replace('—', '');
  }

  async function handleSave(value: number) {
    if (!selection) return;
    setSaving(true);
    try {
      if (selection.kind === 'availability') {
        await onSaveAvailability({
          roomTypeId: selection.roomTypeId,
          fromDate: selection.startDate,
          toDate: selection.endDate,
          availableRooms: value,
        });
      } else if (selection.ratePlanCode && selection.guestCount != null) {
        await onSaveRate({
          roomTypeId: selection.roomTypeId,
          ratePlanCode: selection.ratePlanCode,
          guestCount: selection.guestCount,
          fromDate: selection.startDate,
          toDate: selection.endDate,
          price: value,
        });
      }
      clearSelection();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn('relative w-max min-w-full select-none', dragging && 'touch-none')}
      style={{ ['--inv-label-width' as string]: `${labelWidth}px` }}
    >
      <table className="w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              className={cn(
                stickyLabelHeaderClass,
                'bg-muted px-4 py-2.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase',
              )}
              style={{ width: 'var(--inv-label-width)', minWidth: 'var(--inv-label-width)', maxWidth: 'var(--inv-label-width)' }}
            >
              Rooms & rates
            </th>
            {dates.map((date) => {
              const meta = weekdayMeta(date);
              return (
                <th
                  key={date}
                  className={cn(
                    stickyDateHeaderClass,
                    'px-1.5 py-2.5 text-center',
                    meta.isSunday
                      ? 'bg-danger-50 text-foreground'
                      : 'bg-card text-foreground',
                  )}
                  style={{ width: COL_WIDTH, minWidth: COL_WIDTH }}
                >
                  <div className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                    {meta.dayName}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums leading-none">
                    {meta.dayNum}
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">{meta.month}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {roomTypes.map((roomType) => {
            const isCollapsed = Boolean(collapsed[roomType.roomTypeId]);
            return (
              <RoomTypeSection
                key={roomType.roomTypeId}
                roomType={roomType}
                dates={dates}
                isCollapsed={isCollapsed}
                canUpdate={canUpdate}
                selectedSet={selectedSet}
                selection={selection}
                onToggleCollapse={onToggleCollapse}
                onBeginSelect={beginSelect}
                onExtendSelect={extendSelect}
              />
            );
          })}
        </tbody>
      </table>

      {selection && anchorRect && containerRect && chromeVisible ? (
        <>
          <SelectionChrome
            anchorRect={anchorRect}
            containerRect={containerRect}
            dayCount={
              datesInRange(dates, selection.startDate, selection.endDate).length
            }
            showBadge={dragging}
            canResize={canUpdate}
            onResizeStart={resizeFromEdge}
          />
          {!dragging ? (
            <InventoryEditPopover
              kind={selection.kind}
              initialValue={seedValue(selection)}
              anchorRect={anchorRect}
              saving={saving}
              onCancel={clearSelection}
              onSave={(value) => void handleSave(value)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SelectionChrome({
  anchorRect,
  containerRect,
  dayCount,
  showBadge,
  canResize,
  onResizeStart,
}: {
  anchorRect: DOMRect;
  containerRect: DOMRect;
  dayCount: number;
  showBadge: boolean;
  canResize?: boolean;
  onResizeStart?: (edge: 'start' | 'end') => void;
}) {
  const left = anchorRect.left - containerRect.left;
  const top = anchorRect.top - containerRect.top;
  return (
    <div
      className="pointer-events-none absolute z-[5] box-border rounded-sm border-2 border-brand bg-transparent"
      style={{
        left,
        top,
        width: anchorRect.width,
        height: anchorRect.height,
      }}
    >
      <button
        type="button"
        data-selection-handle
        aria-label="Resize selection start"
        disabled={!canResize}
        className={cn(
          'absolute top-1/2 left-0 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-brand text-brand-foreground ring-2 ring-card',
          canResize && 'pointer-events-auto cursor-ew-resize touch-none',
        )}
        onPointerDown={(event) => {
          if (!canResize || !onResizeStart) return;
          event.preventDefault();
          event.stopPropagation();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // ignore
          }
          onResizeStart('start');
        }}
      >
        <Grip className="h-2.5 w-2.5" />
      </button>
      <button
        type="button"
        data-selection-handle
        aria-label="Resize selection end"
        disabled={!canResize}
        className={cn(
          'absolute top-1/2 right-0 flex h-5 w-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-brand text-brand-foreground ring-2 ring-card',
          canResize && 'pointer-events-auto cursor-ew-resize touch-none',
        )}
        onPointerDown={(event) => {
          if (!canResize || !onResizeStart) return;
          event.preventDefault();
          event.stopPropagation();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // ignore
          }
          onResizeStart('end');
        }}
      >
        <Grip className="h-2.5 w-2.5" />
      </button>
      {showBadge && dayCount > 0 ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-brand px-2 py-0.5 text-[11px] font-semibold text-brand-foreground">
          {dayCount} day{dayCount === 1 ? '' : 's'} selected
        </span>
      ) : null}
    </div>
  );
}

function RoomTypeSection({
  roomType,
  dates,
  isCollapsed,
  canUpdate,
  selectedSet,
  selection,
  onToggleCollapse,
  onBeginSelect,
  onExtendSelect,
}: {
  roomType: InventoryRoomTypeRow;
  dates: string[];
  isCollapsed: boolean;
  canUpdate: boolean;
  selectedSet: Set<string>;
  selection: InventorySelection | null;
  onToggleCollapse: (roomTypeId: number) => void;
  onBeginSelect: (
    roomTypeId: number,
    rowKey: string,
    kind: InventoryEditKind,
    date: string,
    ratePlanCode?: string,
    guestCount?: number,
  ) => void;
  onExtendSelect: (roomTypeId: number, rowKey: string, date: string) => void;
}) {
  const physical = roomType.physicalRoomCount;

  return (
    <>
      <tr className="bg-muted">
        <td
          className={cn(stickyLabelClass, 'border-y bg-muted px-3 py-3')}
          style={{ width: 'var(--inv-label-width)', minWidth: 'var(--inv-label-width)', maxWidth: 'var(--inv-label-width)' }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2.5 text-left"
            onClick={() => onToggleCollapse(roomType.roomTypeId)}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground ring-1 ring-border">
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <BedDouble className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {roomType.roomTypeName}
              </span>
              <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                {physical != null ? `${physical} physical room${physical === 1 ? '' : 's'}` : 'Room type'}
                {roomType.maxGuests != null ? ` · up to ${roomType.maxGuests} guests` : ''}
              </span>
            </span>
          </button>
        </td>
        {dates.map((date) => {
          const day = dayByDate(roomType, date);
          const total = day?.totalInventory;
          const sellPrice = collapsedSellPrice(roomType, day);
          const locked = Boolean(day?.isStopSell);

          if (!isCollapsed) {
            return (
              <td
                key={date}
                className="border-y border-r border-border bg-muted"
                style={{ width: COL_WIDTH }}
              />
            );
          }

          return (
            <td
              key={date}
              className={cn(
                'border-y border-r border-border bg-muted px-1 py-2 text-center',
                locked && 'bg-danger-50',
              )}
              style={{ width: COL_WIDTH }}
              title={
                locked
                  ? 'Stop sell'
                  : `Total rooms: ${total ?? '—'} · Sell rate: ${sellPrice ?? '—'}`
              }
            >
              <div className="flex flex-col items-center gap-0.5 leading-tight">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-foreground',
                    locked && 'text-destructive',
                  )}
                >
                  {total != null ? total : '—'}
                  {locked ? <Lock className="h-3 w-3 text-destructive" /> : null}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium tabular-nums text-muted-foreground',
                    locked && 'text-destructive',
                  )}
                >
                  {sellPrice != null ? `₹${sellPrice}` : '—'}
                </span>
              </div>
            </td>
          );
        })}
      </tr>

      {!isCollapsed ? (
        <>
          <EditableRow
            label="Total rooms"
            hint="Rooms to sell · drag to edit"
            icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
            tone="availability"
            roomTypeId={roomType.roomTypeId}
            rowKey="total-rooms"
            kind="availability"
            dates={dates}
            values={dates.map((date) => {
              const day = dayByDate(roomType, date);
              return String(day?.totalInventory ?? 0);
            })}
            lockedDates={dates.filter((date) => Boolean(dayByDate(roomType, date)?.isStopSell))}
            canUpdate={canUpdate}
            selectedSet={selectedSet}
            selection={selection}
            onBeginSelect={onBeginSelect}
            onExtendSelect={onExtendSelect}
          />
          <EditableRow
            label="Remaining"
            hint="After bookings"
            icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
            tone="availability"
            roomTypeId={roomType.roomTypeId}
            rowKey="remaining"
            kind="availability"
            dates={dates}
            values={dates.map((date) => {
              const day = dayByDate(roomType, date);
              return String(day?.remaining ?? day?.totalInventory ?? 0);
            })}
            lockedDates={dates.filter((date) => Boolean(dayByDate(roomType, date)?.isStopSell))}
            canUpdate={false}
            selectedSet={selectedSet}
            selection={selection}
            onBeginSelect={onBeginSelect}
            onExtendSelect={onExtendSelect}
          />
          {(roomType.ratePlans ?? []).map((plan) => (
            <RatePlanOccupancyBlock
              key={plan.code}
              roomType={roomType}
              planCode={plan.code}
              planLabel={plan.label}
              guestCounts={guestCountsFor(roomType, plan.guestCounts)}
              dates={dates}
              canUpdate={canUpdate}
              selectedSet={selectedSet}
              selection={selection}
              onBeginSelect={onBeginSelect}
              onExtendSelect={onExtendSelect}
            />
          ))}
        </>
      ) : null}
    </>
  );
}

function RatePlanOccupancyBlock({
  roomType,
  planCode,
  planLabel,
  guestCounts,
  dates,
  canUpdate,
  selectedSet,
  selection,
  onBeginSelect,
  onExtendSelect,
}: {
  roomType: InventoryRoomTypeRow;
  planCode: string;
  planLabel: string;
  guestCounts: number[];
  dates: string[];
  canUpdate: boolean;
  selectedSet: Set<string>;
  selection: InventorySelection | null;
  onBeginSelect: (
    roomTypeId: number,
    rowKey: string,
    kind: InventoryEditKind,
    date: string,
    ratePlanCode?: string,
    guestCount?: number,
  ) => void;
  onExtendSelect: (roomTypeId: number, rowKey: string, date: string) => void;
}) {
  return (
    <>
      <tr>
        <td
          className={cn(stickyLabelClass, 'border-b bg-muted px-4 py-2.5')}
          style={{ width: 'var(--inv-label-width)', minWidth: 'var(--inv-label-width)', maxWidth: 'var(--inv-label-width)' }}
        >
          <span className="inline-flex max-w-full items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground ring-1 ring-border">
              <Tag className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-foreground">{planLabel}</span>
              <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Rate plan
              </span>
            </span>
          </span>
        </td>
        {dates.map((date) => (
          <td
            key={date}
            className="border-b border-r border-border bg-muted"
            style={{ width: COL_WIDTH }}
          />
        ))}
      </tr>
      {guestCounts.map((guestCount) => (
        <EditableRow
          key={`${planCode}-${guestCount}`}
          label={`${guestCount} guest${guestCount === 1 ? '' : 's'}`}
          hint="Sell rate"
          icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
          indent
          tone="rate"
          roomTypeId={roomType.roomTypeId}
          rowKey={`rate:${planCode}:${guestCount}`}
          kind="rate"
          ratePlanCode={planCode}
          guestCount={guestCount}
          dates={dates}
          values={dates.map((date) => occupancyDisplay(dayByDate(roomType, date), planCode, guestCount))}
          lockedDates={dates.filter((date) => {
            const day = dayByDate(roomType, date);
            const cell = day?.ratePlans?.find((item) => item.ratePlanCode === planCode);
            return Boolean(day?.isStopSell || cell?.isStopSell);
          })}
          canUpdate={canUpdate}
          selectedSet={selectedSet}
          selection={selection}
          onBeginSelect={onBeginSelect}
          onExtendSelect={onExtendSelect}
        />
      ))}
    </>
  );
}

function EditableRow({
  label,
  hint,
  icon,
  indent,
  tone = 'rate',
  roomTypeId,
  rowKey,
  kind,
  ratePlanCode,
  guestCount,
  dates,
  values,
  lockedDates,
  canUpdate,
  selectedSet,
  selection,
  onBeginSelect,
  onExtendSelect,
}: {
  label: string;
  hint?: string;
  icon?: ReactNode;
  indent?: boolean;
  tone?: 'availability' | 'rate';
  roomTypeId: number;
  rowKey: string;
  kind: InventoryEditKind;
  ratePlanCode?: string;
  guestCount?: number;
  dates: string[];
  values: string[];
  lockedDates: string[];
  canUpdate: boolean;
  selectedSet: Set<string>;
  selection: InventorySelection | null;
  onBeginSelect: (
    roomTypeId: number,
    rowKey: string,
    kind: InventoryEditKind,
    date: string,
    ratePlanCode?: string,
    guestCount?: number,
  ) => void;
  onExtendSelect: (roomTypeId: number, rowKey: string, date: string) => void;
}) {
  const locked = new Set(lockedDates);
  const isAvailability = tone === 'availability';

  return (
    <tr className="bg-card">
      <td
        className={cn(
          stickyLabelClass,
          'border-b bg-card py-2.5',
          indent ? 'pl-8 pr-3' : 'px-4',
        )}
        style={{ width: 'var(--inv-label-width)', minWidth: 'var(--inv-label-width)', maxWidth: 'var(--inv-label-width)' }}
      >
        <span className="inline-flex max-w-full items-center gap-2">
          {icon}
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="block truncate text-xs font-semibold text-foreground">{label}</span>
              {canUpdate ? (
                <span
                  className="shrink-0 rounded-sm border border-input bg-background px-1 py-px text-[9px] font-semibold tracking-wide text-muted-foreground uppercase"
                  title="Editable — click or drag cells"
                >
                  Edit
                </span>
              ) : null}
            </span>
            {hint ? (
              <span className="block text-[10px] font-medium text-muted-foreground">{hint}</span>
            ) : null}
          </span>
        </span>
      </td>
      {dates.map((date, index) => {
        const key = `${roomTypeId}|${rowKey}|${date}`;
        const isSelected = selectedSet.has(key);
        const isLocked = locked.has(date);
        const value = values[index];
        const isZeroAvail = isAvailability && value === '0';
        const isEditable = canUpdate && !isLocked;

        return (
          <td
            key={date}
            data-cell={key}
            className={cn(
              'relative border-b border-r border-border bg-card px-1 py-2 text-center transition-colors',
              isEditable && 'cursor-cell',
              isEditable && !isSelected && 'hover:bg-muted',
              isSelected && 'bg-card',
              isLocked && !isSelected && 'bg-danger-50',
            )}
            style={{ width: COL_WIDTH }}
            onPointerDown={(event) => {
              if (!isEditable) return;
              event.preventDefault();
              event.stopPropagation();
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // Some browsers reject capture on non-primary pointers.
              }
              onBeginSelect(roomTypeId, rowKey, kind, date, ratePlanCode, guestCount);
            }}
            onPointerEnter={() => {
              if (!isEditable) return;
              onExtendSelect(roomTypeId, rowKey, date);
            }}
          >
            <span
              className={cn(
                'inline-flex min-h-7 min-w-[2.75rem] items-center justify-center gap-1 px-1.5 text-xs tabular-nums',
                isAvailability ? 'font-semibold' : 'font-medium',
                isZeroAvail && !isLocked && 'text-muted-foreground',
                isLocked && 'font-semibold text-destructive',
                !isLocked && 'text-foreground',
                // Diff / field style: editable values look like compact inputs
                isEditable &&
                  'rounded-sm border border-input bg-background shadow-none hover:border-brand',
                isSelected && isEditable && 'border-brand ring-1 ring-brand',
                !isEditable && !isLocked && 'text-muted-foreground',
              )}
              title={isEditable ? 'Click or drag to edit' : isLocked ? 'Stop sell' : undefined}
            >
              {value}
              {isLocked ? <Lock className="h-3 w-3 text-destructive" /> : null}
            </span>
            {selection &&
            selection.roomTypeId === roomTypeId &&
            selection.rowKey === rowKey &&
            date >= selection.startDate &&
            date <= selection.endDate ? (
              <span className="pointer-events-none absolute inset-0 z-[1]" />
            ) : null}
          </td>
        );
      })}
    </tr>
  );
}
