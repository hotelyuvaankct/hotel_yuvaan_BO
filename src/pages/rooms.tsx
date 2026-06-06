import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Room, RoomType } from '@/lib/api-types';
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

export function RoomsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(session?.perms, 'rooms', 'create');
  const canRead = hasPermission(session?.perms, 'rooms', 'read');
  const canUpdate = hasPermission(session?.perms, 'rooms', 'update');
  const canDelete = hasPermission(session?.perms, 'rooms', 'delete');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState({ roomNumber: '', roomTypeId: '', roomStatus: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  async function load(targetPage = page, activeFilters = appliedFilters) {
    setLoading(true);
    try {
      const result = await api.listRooms({
        page: targetPage,
        size: 10,
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
      const nextPage = rooms.length === 1 && page > 0 ? page - 1 : page;
      await load(nextPage);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete room.', 'error');
    }
  }

  useEffect(() => {
    if (!canRead) return;
    void Promise.all([
      load(0, appliedFilters),
      api.listRoomTypes().then(setRoomTypes),
    ]).catch((err) => {
      showToast(err instanceof Error ? err.message : 'Unable to load room filters.', 'error');
    });
  }, [canRead]);

  function applyFilters() {
    setAppliedFilters(filters);
    setPage(0);
    void load(0, filters);
  }

  function clearFilters() {
    const emptyFilters = { roomNumber: '', roomTypeId: '', roomStatus: '' };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(0);
    void load(0, emptyFilters);
  }

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
            <CardDescription>{totalElements} room{totalElements === 1 ? '' : 's'} found. Showing 10 per page.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
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
          <form
            className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
            }}
          >
            <input
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              placeholder="Search room number"
              value={filters.roomNumber}
              onChange={(event) => setFilters((current) => ({ ...current, roomNumber: event.target.value }))}
            />
            <select
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              value={filters.roomTypeId}
              onChange={(event) => setFilters((current) => ({ ...current, roomTypeId: event.target.value }))}
            >
              <option value="">All room types</option>
              {roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name}</option>)}
            </select>
            <select
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              value={filters.roomStatus}
              onChange={(event) => setFilters((current) => ({ ...current, roomStatus: event.target.value }))}
            >
              <option value="">All room statuses</option>
              {roomStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="gold">
                <Search className="h-4 w-4" />
                Search
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
            </div>
          </form>
          <div className="overflow-x-auto">
          {loading ? <LoadingState /> : null}
          {!loading ? (
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
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
                    <td className="px-3 py-6" colSpan={8}><EmptyState /></td>
                  </tr>
                ) : null}
                {rooms.map((room) => (
                  <tr key={room.id} className="border-t border-border">
                    <td className="px-3 py-3">
                      {room.images?.[0] ? (
                        <img
                          src={(room.images.find((image) => image.primary) ?? room.images[0]).publicUrl}
                          alt={`Room ${room.roomNumber}`}
                          className="h-12 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded-lg bg-muted" />
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium">{room.roomNumber}</td>
                    <td className="px-3 py-3 text-muted-foreground">{room.hotelName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{room.roomTypeName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{room.floor ?? '-'}</td>
                    <td className="px-3 py-3">
                      <Badge variant={room.roomStatus === 1 ? 'success' : room.roomStatus === 2 ? 'gold' : 'warning'}>{optionLabel(roomStatusOptions, room.roomStatus)}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={room.status === 1 ? 'success' : 'secondary'}>{optionLabel(recordStatusOptions, room.status)}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" disabled={!canUpdate} onClick={() => undefined}>
                          <Link to={`/rooms/${room.id}/edit`} className="inline-flex items-center gap-2"><Edit className="h-4 w-4" />Edit</Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void deleteRoom(room)} disabled={!canDelete} aria-label="Delete room"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || page === 0}
                onClick={() => void load(page - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || page + 1 >= totalPages}
                onClick={() => void load(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
