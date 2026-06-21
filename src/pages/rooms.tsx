import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { HotelSummary, Room, RoomType } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions, roomStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { Pagination } from '@/components/common/pagination';
import { SelectField, TextField } from '@/components/ui/form-fields';
import { Status } from '@/lib/constants';

const emptyFilters = { hotelId: '', roomNumber: '', roomTypeId: '', roomStatus: '' };

type RoomSelection = {
  selectAll: boolean;
  ids: number[];
};

const emptySelection: RoomSelection = { selectAll: false, ids: [] };

function isRoomSelected(roomId: number, selection: RoomSelection) {
  return selection.selectAll ? !selection.ids.includes(roomId) : selection.ids.includes(roomId);
}

function selectedCount(totalElements: number, selection: RoomSelection) {
  if (selection.selectAll) {
    return Math.max(0, totalElements - selection.ids.length);
  }
  return selection.ids.length;
}

function buildDeletePayload(
  selection: RoomSelection,
  activeFilters: typeof emptyFilters,
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
  const [filters, setFilters] = useState(emptyFilters);

  async function load(targetPage = page, activeFilters = filters) {
    setLoading(true);
    try {
      const result = await api.listRooms({
        page: targetPage,
        size: 10,
        hotelId: activeFilters.hotelId ? Number(activeFilters.hotelId) : undefined,
        roomNumber: activeFilters.roomNumber,
        roomTypeId: activeFilters.roomTypeId ? Number(activeFilters.roomTypeId) : undefined,
        roomStatus: activeFilters.roomStatus ? Number(activeFilters.roomStatus) : undefined,
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
        setRoomTypes(items ?? []);
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
    const timeout = window.setTimeout(() => {
      setPage(0);
      void load(0, filters);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [canRead, filters.hotelId, filters.roomNumber, filters.roomTypeId, filters.roomStatus]);

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

  const selectedRoomCount = selectedCount(totalElements, selection);
  const allVisibleSelected = rooms.length > 0 && rooms.every((room) => isRoomSelected(room.id, selection));
  const someVisibleSelected = rooms.some((room) => isRoomSelected(room.id, selection));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Room listing</CardTitle>
            <CardDescription>{totalElements} room{totalElements === 1 ? '' : 's'} found. Filters update automatically.</CardDescription>
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
            <Button variant="gold" size="sm" disabled={!canCreate} onClick={() => undefined}>
              <Link to="/rooms/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add room
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_1fr_220px_220px_auto]">
            <SelectField
              variant="filter"
              value={filters.hotelId}
              placeholder="All hotels"
              options={hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))}
              onChange={(event) => setFilters((current) => ({ ...current, hotelId: event.target.value }))}
            />
            <TextField
              placeholder="Search room number"
              value={filters.roomNumber}
              onChange={(event) => setFilters((current) => ({ ...current, roomNumber: event.target.value }))}
            />
            {canReadRoomTypes ? (
              <SelectField
                variant="filter"
                value={filters.roomTypeId}
                placeholder="All room types"
                options={roomTypes.map((roomType) => ({ value: roomType.id, label: roomType.name }))}
                onChange={(event) => setFilters((current) => ({ ...current, roomTypeId: event.target.value }))}
              />
            ) : <div className="hidden xl:block" />}
            <SelectField
              variant="filter"
              value={filters.roomStatus}
              placeholder="All room statuses"
              options={roomStatusOptions.map((option) => ({ value: option.value, label: option.label }))}
              onChange={(event) => setFilters((current) => ({ ...current, roomStatus: event.target.value }))}
            />
            <Button type="button" variant="outline" onClick={() => setFilters(emptyFilters)}>Clear</Button>
          </div>

          <div className="overflow-x-auto">
            {loading ? <LoadingState /> : null}
            {!loading ? (
              <table className="w-full min-w-[940px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-amber-500"
                        checked={allVisibleSelected}
                        ref={(element) => {
                          if (element) {
                            element.indeterminate = someVisibleSelected && !allVisibleSelected;
                          }
                        }}
                        onChange={(event) => toggleSelectAll(event.target.checked)}
                        aria-label="Select all rooms matching filters"
                      />
                    </th>
                    <th className="px-3 py-2 font-medium">Image</th>
                    <th className="px-3 py-2 font-medium">Room</th>
                    <th className="px-3 py-2 font-medium">Hotel</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Floor</th>
                    <th className="px-3 py-2 font-medium">Room status</th>
                    <th className="px-3 py-2 font-medium">Record status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6" colSpan={9}><EmptyState /></td>
                    </tr>
                  ) : null}
                  {rooms.map((room) => (
                    <tr key={room.id} className="border-t border-border">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-amber-500"
                          checked={isRoomSelected(room.id, selection)}
                          onChange={(event) => toggleRoomSelection(room.id, event.target.checked)}
                          aria-label={`Select room ${room.roomNumber}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        {room.images?.[0] ? (
                          <img
                            src={(room.images.find((image) => image.primary) ?? room.images[0]).publicUrl}
                            alt={`Room ${room.roomNumber}`}
                            className="h-12 w-16 rounded-lg object-cover"
                          />
                        ) : <div className="h-12 w-16 rounded-lg bg-muted" />}
                      </td>
                      <td className="px-3 py-3 font-medium">{room.roomNumber}</td>
                      <td className="px-3 py-3 text-muted-foreground">{room.hotelName}</td>
                      <td className="px-3 py-3 text-muted-foreground">{room.roomTypeName}</td>
                      <td className="px-3 py-3 text-muted-foreground">{room.floor ?? '-'}</td>
                      <td className="px-3 py-3">
                        <Badge variant={room.roomStatus === 1 ? 'success' : room.roomStatus === 2 ? 'gold' : 'warning'}>
                          {optionLabel(roomStatusOptions, room.roomStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={room.status === Status.ACTIVE ? 'success' : 'secondary'}>{optionLabel(recordStatusOptions, room.status)}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => undefined}>
                            <Link to={`/rooms/${room.id}`} className="inline-flex items-center gap-2"><Eye className="h-4 w-4" />View</Link>
                          </Button>
                          <Button variant="outline" size="sm" disabled={!canUpdate} onClick={() => undefined}>
                            <Link to={`/rooms/${room.id}/edit`} className="inline-flex items-center gap-2"><Edit className="h-4 w-4" />Edit</Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => void deleteRoom(room)} disabled={!canDelete} aria-label="Delete room">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>

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
