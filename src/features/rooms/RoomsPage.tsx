import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { HotelSummary, Room, RoomType } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions, roomStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SelectField, TextField } from '@/components/ui/form-fields';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';
import { Status } from '@/lib/constants';
import { addDaysIso, getRoomDateFilterErrors, normalizeRoomDateFilters, todayIso } from '@/lib/form-validation';
import { sortRoomTypes } from '@/lib/room-types';

function createDefaultFilters() {
  const checkIn = todayIso();
  return {
    hotelId: '',
    roomNumber: '',
    roomTypeId: '',
    roomStatus: '',
    checkIn,
    checkOut: addDaysIso(checkIn, 1),
  };
}

type RoomSelection = {
  selectAll: boolean;
  ids: number[];
};

const emptySelection: RoomSelection = { selectAll: false, ids: [] };

function isRoomSelected(roomId: number, selection: RoomSelection) {
  return selection.selectAll ? !selection.ids.includes(roomId) : selection.ids.includes(roomId);
}

function displayAvailabilityStatus(room: Room) {
  return room.availabilityStatus ?? room.roomStatus;
}

function formatAvailabilityDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

function selectedCount(totalElements: number, selection: RoomSelection) {
  if (selection.selectAll) {
    return Math.max(0, totalElements - selection.ids.length);
  }
  return selection.ids.length;
}

function buildDeletePayload(
  selection: RoomSelection,
  activeFilters: ReturnType<typeof createDefaultFilters>,
): Parameters<typeof api.deleteRooms>[0] {
  if (selection.selectAll) {
    return {
      selectAll: true,
      hotelId: activeFilters.hotelId ? Number(activeFilters.hotelId) : undefined,
      roomNumber: activeFilters.roomNumber.trim() || undefined,
      roomTypeId: activeFilters.roomTypeId ? Number(activeFilters.roomTypeId) : undefined,
      roomStatus: activeFilters.roomStatus ? Number(activeFilters.roomStatus) : undefined,
      excludeRoomIds: selection.ids.length > 0 ? selection.ids : undefined,
    };
  }
  return { roomIds: selection.ids };
}

function availabilityTone(status?: number): BadgeTone {
  if (status === 1) return 'success';
  if (status === 2) return 'warning';
  return 'warning';
}

function recordStatusTone(status?: number): BadgeTone {
  return status === Status.ACTIVE ? 'success' : 'neutral';
}

function RoomActions({
  room,
  canUpdate,
  canDelete,
  onDelete,
}: {
  room: Room;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (room: Room) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm">
        <Link to={`/rooms/${room.id}`} className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View
        </Link>
      </Button>
      <Button variant="outline" size="sm" disabled={!canUpdate}>
        <Link to={`/rooms/${room.id}/edit`} className="inline-flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void onDelete(room)}
        disabled={!canDelete}
        aria-label="Delete room"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function RoomsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(session?.perms, 'rooms', 'create');
  const canRead = hasPermission(session?.perms, 'rooms', 'read');
  const canUpdate = hasPermission(session?.perms, 'rooms', 'update');
  const canDelete = hasPermission(session?.perms, 'rooms', 'delete');
  const canReadRoomTypes = hasPermission(session?.perms, 'room-types', 'read');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selection, setSelection] = useState<RoomSelection>(emptySelection);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState(createDefaultFilters);
  const [filterErrors, setFilterErrors] = useState<Record<string, string>>({});

  async function load(targetPage = page, activeFilters = filters) {
    const dateErrors = getRoomDateFilterErrors(activeFilters.checkIn, activeFilters.checkOut);
    if (Object.keys(dateErrors).length > 0) {
      setFilterErrors(dateErrors);
      setLoading(false);
      return;
    }

    setFilterErrors({});
    setLoading(true);
    try {
      const result = await api.listRooms({
        page: targetPage,
        size: 10,
        hotelId: activeFilters.hotelId ? Number(activeFilters.hotelId) : undefined,
        roomNumber: activeFilters.roomNumber,
        roomTypeId: activeFilters.roomTypeId ? Number(activeFilters.roomTypeId) : undefined,
        roomStatus: activeFilters.roomStatus ? Number(activeFilters.roomStatus) : undefined,
        checkIn: activeFilters.checkIn,
        checkOut: activeFilters.checkOut,
      });
      setRooms(result.content ?? []);
      setPage(result.number ?? targetPage);
      setTotalPages(result.totalPages ?? 0);
      setTotalElements(result.totalElements ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load rooms.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteRoom(room: Room) {
    const confirmed = await confirm({
      title: 'Delete room?',
      description: `This will remove room ${room.roomNumber} from the active room listing.`,
      confirmLabel: 'Delete room',
    });
    if (!confirmed) return;
    try {
      await api.deleteRoom(room.id);
      showToast('Room deleted.', 'success');
      await load(rooms.length === 1 && page > 0 ? page - 1 : page);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete room.', 'error');
    }
  }

  async function deleteSelectedRooms() {
    const count = selectedCount(totalElements, selection);
    if (count === 0) return;

    const confirmed = await confirm({
      title: `Delete ${count} rooms?`,
      description: selection.selectAll
        ? 'All rooms matching the current filters will be removed, except any you unchecked.'
        : 'All selected rooms will be removed from the active room listing.',
      confirmLabel: 'Delete rooms',
    });
    if (!confirmed) return;

    try {
      await api.deleteRooms(buildDeletePayload(selection, filters));
      showToast(`${count} rooms deleted.`, 'success');
      setSelection(emptySelection);
      await load(page);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete selected rooms.', 'error');
    }
  }

  function toggleSelectAll(checked: boolean) {
    setSelection(checked ? { selectAll: true, ids: [] } : emptySelection);
  }

  function toggleRoomSelection(roomId: number, checked: boolean) {
    setSelection((current) => {
      if (current.selectAll) {
        if (checked) {
          return { selectAll: true, ids: current.ids.filter((id) => id !== roomId) };
        }
        return current.ids.includes(roomId)
          ? current
          : { selectAll: true, ids: [...current.ids, roomId] };
      }

      if (checked) {
        return current.ids.includes(roomId)
          ? current
          : { selectAll: false, ids: [...current.ids, roomId] };
      }
      return { selectAll: false, ids: current.ids.filter((id) => id !== roomId) };
    });
  }

  useEffect(() => {
    if (!canRead) return;
    void api.listHotels()
      .then((hotelList) => setHotels(hotelList ?? []))
      .catch((err) => showToast(err instanceof Error ? err.message : 'Unable to load hotels.', 'error'));
  }, [canRead, showToast]);

  useEffect(() => {
    if (!canReadRoomTypes) return;
    const hotelId = filters.hotelId ? Number(filters.hotelId) : undefined;
    void api.listRoomTypes(hotelId)
      .then((items) => {
        setRoomTypes(sortRoomTypes(items ?? []));
        setFilters((current) => {
          const nextRoomTypeId = items.some((item) => String(item.id) === current.roomTypeId)
            ? current.roomTypeId
            : '';
          return nextRoomTypeId === current.roomTypeId ? current : { ...current, roomTypeId: nextRoomTypeId };
        });
      })
      .catch(() => undefined);
  }, [canReadRoomTypes, filters.hotelId]);

  useEffect(() => {
    if (!canRead) return;
    setSelection(emptySelection);

    const dateErrors = getRoomDateFilterErrors(filters.checkIn, filters.checkOut);
    if (Object.keys(dateErrors).length > 0) {
      setFilterErrors(dateErrors);
      setLoading(false);
      return;
    }

    setFilterErrors({});
    const timeout = window.setTimeout(() => {
      setPage(0);
      void load(0, filters);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [canRead, filters.hotelId, filters.roomNumber, filters.roomTypeId, filters.roomStatus, filters.checkIn, filters.checkOut]);

  const allVisibleSelected = rooms.length > 0 && rooms.every((room) => isRoomSelected(room.id, selection));
  const someVisibleSelected = rooms.some((room) => isRoomSelected(room.id, selection));
  const hasDateFilterErrors = Object.keys(filterErrors).length > 0;
  const selectedRoomCount = selectedCount(totalElements, selection);

  const columns = useMemo<Array<DataTableColumn<Room>>>(
    () => [
      {
        key: 'select',
        header: '',
        width: '48px',
        render: (room) => (
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand"
            checked={isRoomSelected(room.id, selection)}
            onChange={(event) => toggleRoomSelection(room.id, event.target.checked)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select room ${room.roomNumber}`}
          />
        ),
      },
      {
        key: 'image',
        header: 'Image',
        width: '80px',
        render: (room) =>
          room.images?.[0] ? (
            <img
              src={(room.images.find((image) => image.primary) ?? room.images[0]).publicUrl}
              alt={`Room ${room.roomNumber}`}
              className="h-12 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="h-12 w-16 rounded-lg bg-muted" />
          ),
      },
      {
        key: 'roomNumber',
        header: 'Room',
        render: (room) => <span className="font-medium">{room.roomNumber}</span>,
      },
      { key: 'hotelName', header: 'Hotel' },
      { key: 'roomTypeName', header: 'Type' },
      {
        key: 'floor',
        header: 'Floor',
        render: (room) => room.floor ?? '-',
      },
      {
        key: 'availabilityStatus',
        header: 'Availability',
        render: (room) => {
          const status = displayAvailabilityStatus(room);
          return (
            <Badge tone={availabilityTone(status)}>{optionLabel(roomStatusOptions, status)}</Badge>
          );
        },
      },
      {
        key: 'status',
        header: 'Record status',
        render: (room) => (
          <Badge tone={recordStatusTone(room.status)}>{optionLabel(recordStatusOptions, room.status)}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (room) => (
          <RoomActions room={room} canUpdate={canUpdate} canDelete={canDelete} onDelete={deleteRoom} />
        ),
      },
    ],
    [selection, canUpdate, canDelete],
  );

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your current role does not include read access for rooms.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Room listing</CardTitle>
            <CardDescription>
              {hasDateFilterErrors
                ? 'Fix the availability dates below to load rooms.'
                : `${totalElements} room${totalElements === 1 ? '' : 's'} found for ${formatAvailabilityDate(filters.checkIn)} to ${formatAvailabilityDate(filters.checkOut)}.`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRoomCount > 0 ? (
              <Button variant="outline" size="sm" disabled={!canDelete} onClick={() => void deleteSelectedRooms()}>
                <Trash2 className="h-4 w-4" />
                Delete selected ({selectedRoomCount})
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="primary" size="sm" disabled={!canCreate}>
              <Link to="/rooms/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add room
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,340px)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,180px)_minmax(160px,180px)_auto]">
            <DateRangePicker
              variant="filter"
              label="Stay dates"
              required
              startValue={filters.checkIn}
              endValue={filters.checkOut}
              error={filterErrors.checkIn || filterErrors.checkOut}
              onChange={(checkIn, checkOut) => {
                const next = normalizeRoomDateFilters(checkIn, checkOut);
                setFilters((current) => ({ ...current, ...next }));
                setFilterErrors((current) => {
                  const cleared = { ...current };
                  delete cleared.checkIn;
                  delete cleared.checkOut;
                  return cleared;
                });
              }}
            />
            <TextField
              label="Room number"
              placeholder="Search room number"
              value={filters.roomNumber}
              onChange={(event) => setFilters((current) => ({ ...current, roomNumber: event.target.value }))}
            />
            {canReadRoomTypes ? (
              <SelectField
                variant="filter"
                label="Room type"
                value={filters.roomTypeId}
                placeholder="All room types"
                options={roomTypes.map((roomType) => ({ value: roomType.id, label: roomType.name }))}
                onChange={(event) => setFilters((current) => ({ ...current, roomTypeId: event.target.value }))}
              />
            ) : (
              <div className="hidden xl:block" aria-hidden />
            )}
            <SelectField
              variant="filter"
              label="Availability"
              value={filters.roomStatus}
              placeholder="All availability"
              options={roomStatusOptions.map((option) => ({ value: option.value, label: option.label }))}
              onChange={(event) => setFilters((current) => ({ ...current, roomStatus: event.target.value }))}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => {
                setFilters(createDefaultFilters());
                setFilterErrors({});
              }}
              aria-label="Clear filters"
              title="Clear filters"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden md:flex md:items-center md:gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={allVisibleSelected}
              ref={(element) => {
                if (element) {
                  element.indeterminate = someVisibleSelected && !allVisibleSelected;
                }
              }}
              onChange={(event) => toggleSelectAll(event.target.checked)}
              aria-label="Select all rooms matching filters"
            />
            <span className="text-sm text-muted-foreground">Select all on this page</span>
          </div>

          <ResponsiveList
            columns={columns}
            data={rooms}
            isLoading={loading}
            emptyState={<EmptyState />}
            renderMobileCard={(room) => {
              const availability = displayAvailabilityStatus(room);
              return (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-brand"
                        checked={isRoomSelected(room.id, selection)}
                        onChange={(event) => toggleRoomSelection(room.id, event.target.checked)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Select room ${room.roomNumber}`}
                      />
                      <p className="truncate font-semibold">{room.roomNumber}</p>
                    </div>
                    <Badge tone={availabilityTone(availability)} className="shrink-0">
                      {optionLabel(roomStatusOptions, availability)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Hotel</span>
                    <span className="text-foreground">{room.hotelName || '-'}</span>
                    <span className="text-muted-foreground">Type</span>
                    <span className="text-foreground">{room.roomTypeName || '-'}</span>
                    <span className="text-muted-foreground">Floor</span>
                    <span className="text-foreground">{room.floor ?? '-'}</span>
                    <span className="text-muted-foreground">Record</span>
                    <span className="text-foreground">{optionLabel(recordStatusOptions, room.status)}</span>
                  </div>
                  <RoomActions room={room} canUpdate={canUpdate} canDelete={canDelete} onDelete={deleteRoom} />
                </div>
              );
            }}
          />

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
