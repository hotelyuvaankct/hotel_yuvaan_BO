import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type {
  HotelSummary,
  InventoryBlockConflict,
  InventoryBlockedRange,
  InventoryGrid,
} from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { SelectField } from '@/components/ui/form-fields';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDaysIso, todayIso } from '@/lib/form-validation';
import { mergeInventoryGrids } from '@/lib/inventory-grid';
import { InventoryCalendarGrid } from '@/components/inventory/inventory-calendar-grid';
import { InventoryBlockDialog } from '@/components/inventory/inventory-block-dialog';
import { cn } from '@/lib/utils';

type InventoryTab = 'grid' | 'blocked';

const tabLabels: Record<InventoryTab, string> = {
  grid: 'Daily grid',
  blocked: 'Blocked ranges',
};

const INITIAL_DAYS = 30;
const PAGE_DAYS = 10;

export function InventoryPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'inventory', 'read');
  const canUpdate = hasPermission(session?.perms, 'inventory', 'update');

  const [hotelId, setHotelId] = useState('');
  const [fromDate, setFromDate] = useState(() => todayIso());
  const [toDate, setToDate] = useState(() => addDaysIso(todayIso(), INITIAL_DAYS - 1));
  const [rangeStart, setRangeStart] = useState(() => todayIso());
  const [rangeEnd, setRangeEnd] = useState(() => addDaysIso(todayIso(), INITIAL_DAYS - 1));
  const [roomFilter, setRoomFilter] = useState('all');
  const [grid, setGrid] = useState<InventoryGrid | null>(null);
  const [blocked, setBlocked] = useState<InventoryBlockedRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockMode, setBlockMode] = useState<'block' | 'unblock'>('block');
  const [conflicts, setConflicts] = useState<InventoryBlockConflict[]>([]);
  const [tab, setTab] = useState<InventoryTab>('grid');
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const canLoadMore = useMemo(() => {
    const inventoryToDate = grid?.inventoryToDate;
    return Boolean(inventoryToDate && toDate < inventoryToDate);
  }, [grid?.inventoryToDate, toDate]);

  const loadRange = useCallback(
    async (activeHotelId: string, start: string, end: string) => {
      if (!canRead || !activeHotelId) return;
      setLoading(true);
      try {
        const [nextGrid, blockedResponse] = await Promise.all([
          api.getInventoryGrid(Number(activeHotelId), start, end),
          api.getBlockedInventory(Number(activeHotelId), start, end),
        ]);
        setFromDate(start);
        setToDate(end);
        setRangeStart(start);
        setRangeEnd(end);
        setGrid(nextGrid);
        setBlocked(blockedResponse.ranges ?? []);
        setConflicts([]);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to load inventory', 'error');
      } finally {
        setLoading(false);
      }
    },
    [canRead, showToast],
  );

  const loadInitial = useCallback(
    async (activeHotelId: string) => {
      const start = todayIso();
      await loadRange(activeHotelId, start, addDaysIso(start, INITIAL_DAYS - 1));
    },
    [loadRange],
  );

  const reloadCurrent = useCallback(async () => {
    if (!hotelId) return;
    await loadRange(hotelId, fromDate, toDate);
  }, [fromDate, hotelId, loadRange, toDate]);

  const loadMoreDates = useCallback(async () => {
    if (!canRead || !hotelId || !canLoadMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextFrom = addDaysIso(toDate, 1);
    const inventoryToDate = grid?.inventoryToDate;
    if (!inventoryToDate || nextFrom > inventoryToDate) {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      return;
    }
    const candidateTo = addDaysIso(toDate, PAGE_DAYS);
    const nextTo = candidateTo < inventoryToDate ? candidateTo : inventoryToDate;
    try {
      const [chunk, blockedChunk] = await Promise.all([
        api.getInventoryGrid(Number(hotelId), nextFrom, nextTo),
        api.getBlockedInventory(Number(hotelId), fromDate, nextTo),
      ]);
      setGrid((current) => mergeInventoryGrids(current, chunk));
      setBlocked(blockedChunk.ranges ?? []);
      setToDate(nextTo);
      setRangeEnd(nextTo);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load more dates', 'error');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [canLoadMore, canRead, fromDate, grid?.inventoryToDate, hotelId, showToast, toDate]);

  useEffect(() => {
    if (!canRead) return;
    void api
      .listHotels()
      .then((items: HotelSummary[]) => {
        if (items.length === 0) {
          setLoading(false);
          return;
        }
        const id = String(items[0].id);
        setHotelId(id);
        void loadInitial(id);
      })
      .catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : 'Failed to load hotels', 'error');
        setLoading(false);
      });
  }, [canRead, loadInitial, showToast]);

  const dates = useMemo(() => grid?.roomTypes[0]?.days.map((d) => d.date) ?? [], [grid]);

  const visibleRoomTypes = useMemo(() => {
    if (!grid) return [];
    if (roomFilter === 'all') return grid.roomTypes;
    return grid.roomTypes.filter((row) => String(row.roomTypeId) === roomFilter);
  }, [grid, roomFilter]);

  function handleGridScroll() {
    const el = scrollRef.current;
    if (!el || loadingMoreRef.current || !canLoadMore) return;
    const remaining = el.scrollWidth - el.scrollLeft - el.clientWidth;
    if (remaining < 240) {
      void loadMoreDates();
    }
  }

  async function saveAvailability(payload: {
    roomTypeId: number;
    fromDate: string;
    toDate: string;
    availableRooms: number;
  }) {
    if (!canUpdate) return;
    try {
      const next = await api.bulkUpdateInventory({
        roomTypeId: payload.roomTypeId,
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        totalInventory: payload.availableRooms,
      });
      setGrid((current) => mergeInventoryGrids(current, next));
      showToast('Availability updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Save failed', 'error');
      throw error;
    }
  }

  async function saveRate(payload: {
    roomTypeId: number;
    ratePlanCode: string;
    guestCount: number;
    fromDate: string;
    toDate: string;
    price: number;
  }) {
    if (!canUpdate) return;
    try {
      const next = await api.bulkUpdateInventory({
        roomTypeId: payload.roomTypeId,
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        ratePlanCode: payload.ratePlanCode,
        guestCount: payload.guestCount,
        ratePlanPrice: payload.price,
      });
      setGrid((current) => mergeInventoryGrids(current, next));
      showToast('Rate updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Save failed', 'error');
      throw error;
    }
  }

  async function handleBlockSubmit(payload: {
    hotelId: number;
    fromDate: string;
    toDate: string;
    reason?: string;
  }) {
    try {
      if (blockMode === 'block') {
        await api.blockInventory(payload);
        showToast('Dates blocked', 'success');
      } else {
        await api.unblockInventory(payload);
        showToast('Dates unblocked', 'success');
      }
      setBlockOpen(false);
      setConflicts([]);
      await reloadCurrent();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const data = error.data as { conflicts?: InventoryBlockConflict[] } | undefined;
        setConflicts(data?.conflicts ?? []);
        showToast(error.message, 'error');
        return;
      }
      showToast(error instanceof Error ? error.message : 'Block action failed', 'error');
    }
  }

  if (!canRead) {
    return <EmptyState label="You do not have permission to view inventory." />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-white px-4 py-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inventory</h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
            Set how many rooms you can sell each night, then adjust guest rates by date.
          </p>
        </div>
        {canUpdate ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-[112px] border-slate-200"
              onClick={() => {
                setBlockMode('block');
                setConflicts([]);
                setBlockOpen(true);
              }}
            >
              <Lock className="h-4 w-4" />
              Block
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-[112px] border-slate-200"
              onClick={() => {
                setBlockMode('unblock');
                setConflicts([]);
                setBlockOpen(true);
              }}
            >
              <Unlock className="h-4 w-4" />
              Unblock
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200/80 bg-white px-4 py-3 sm:gap-4 sm:px-6">
        <Button
          type="button"
          variant="outline"
          className="h-10 border-slate-200"
          onClick={() => {
            if (!hotelId) return;
            void loadInitial(hotelId);
            scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
          }}
        >
          Today
        </Button>
        <DateRangePicker
          variant="filter"
          label="Stay dates"
          wrapperClassName="min-w-[240px]"
          startValue={rangeStart}
          endValue={rangeEnd}
          minDate={todayIso()}
          maxDate={grid?.inventoryToDate ?? undefined}
          onChange={(start, end) => {
            setRangeStart(start);
            setRangeEnd(end);
            if (hotelId) void loadRange(hotelId, start, end);
          }}
        />
        <SelectField
          variant="filter"
          label="Rooms"
          wrapperClassName="min-w-[180px]"
          value={roomFilter}
          onChange={(event) => setRoomFilter(event.target.value)}
          options={[
            { value: 'all', label: `All rooms (${grid?.roomTypes.length ?? 0})` },
            ...(grid?.roomTypes.map((row) => ({
              value: String(row.roomTypeId),
              label: row.roomTypeName,
            })) ?? []),
          ]}
        />
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(Object.keys(tabLabels) as InventoryTab[]).map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                tab === value
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800',
              )}
              onClick={() => setTab(value)}
            >
              {tabLabels[value]}
              {value === 'blocked' && blocked.length > 0 ? (
                <span className="ml-1.5 text-xs text-slate-400">({blocked.length})</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'grid' ? (
          loading ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-white px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50">
                <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-sky-950">Loading inventory</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Fetching room rates and availability…</p>
              </div>
            </div>
          ) : !grid || grid.roomTypes.length === 0 ? (
            <div className="p-6">
              <EmptyState label="No room types yet. Create room types first, then configure inventory dates here." />
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-auto bg-white"
                onScroll={handleGridScroll}
              >
                <InventoryCalendarGrid
                  roomTypes={visibleRoomTypes}
                  dates={dates}
                  canUpdate={canUpdate}
                  collapsed={collapsed}
                  onToggleCollapse={(roomTypeId) =>
                    setCollapsed((prev) => ({ ...prev, [roomTypeId]: !prev[roomTypeId] }))
                  }
                  onSaveAvailability={saveAvailability}
                  onSaveRate={saveRate}
                />
              </div>
              {loadingMore ? (
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-36 items-center justify-end pr-4 sm:w-44"
                  aria-live="polite"
                  aria-busy="true"
                  aria-label="Loading more dates"
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-l from-white via-white/70 to-transparent"
                  />
                  <div className="relative flex items-center gap-2 rounded-full border border-sky-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-sky-900 shadow-md shadow-sky-900/5 backdrop-blur-sm">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-600" />
                    <span>Loading dates</span>
                  </div>
                </div>
              ) : null}
            </div>
          )
        ) : (
          <div className="min-h-0 flex-1 overflow-auto px-4 py-5 sm:px-6">
            <p className="mb-4 text-sm text-slate-500">
              Consecutive stop-sell windows in the loaded date range.
            </p>
            {loading ? (
              <LoadingState label="Loading blocked ranges…" />
            ) : blocked.length === 0 ? (
              <EmptyState label="No blocked dates in this range." />
            ) : (
              <ul className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                {blocked.map((range) => (
                  <li
                    key={`${range.roomTypeId}-${range.ratePlanCode ?? 'rt'}-${range.fromDate}-${range.toDate}`}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="font-semibold text-slate-900">{range.roomTypeName}</span>
                    {range.ratePlanLabel || range.ratePlanCode ? (
                      <span className="text-slate-500">
                        {' '}
                        · {range.ratePlanLabel ?? range.ratePlanCode}
                      </span>
                    ) : (
                      <span className="text-slate-500"> · Room type</span>
                    )}
                    <div className="mt-1 text-slate-600">
                      {range.fromDate} → {range.toDate}
                      {range.reason ? ` · ${range.reason}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <InventoryBlockDialog
        open={blockOpen}
        mode={blockMode}
        hotelId={hotelId ? Number(hotelId) : null}
        maxDate={grid?.inventoryToDate ?? undefined}
        conflicts={conflicts}
        onClose={() => setBlockOpen(false)}
        onSubmit={handleBlockSubmit}
      />
    </div>
  );
}
