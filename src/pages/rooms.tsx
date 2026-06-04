import { FormEvent, useEffect, useState } from 'react';
import { BedDouble, Eye, RefreshCw, Save, Trash2 } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { HotelSummary, Room, RoomType, UpsertRoomPayload } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission, permissionLabel } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const inputClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';
const emptyForm = { hotelId: 0, roomTypeId: 0, roomNumber: '', floor: 1, roomStatus: 1, status: 1, notes: '' };

function roomStatusLabel(status?: number) {
  if (status === 2) return 'Occupied';
  if (status === 3) return 'Maintenance';
  if (status === 4) return 'Blocked';
  return 'Available';
}

export function RoomsPage() {
  const { session } = useAuth();
  const canCreate = hasPermission(session?.perms, 'rooms', 'create');
  const canRead = hasPermission(session?.perms, 'rooms', 'read');
  const canUpdate = hasPermission(session?.perms, 'rooms', 'update');
  const canDelete = hasPermission(session?.perms, 'rooms', 'delete');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<UpsertRoomPayload>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const [roomList, hotelList, roomTypeList] = await Promise.all([
        api.listRooms(),
        api.listHotels(),
        api.listRoomTypes(),
      ]);
      setRooms(roomList ?? []);
      setHotels(hotelList ?? []);
      setRoomTypes(roomTypeList ?? []);
      setForm((current) => ({
        ...current,
        hotelId: current.hotelId || hotelList?.[0]?.id || 0,
        roomTypeId: current.roomTypeId || roomTypeList?.[0]?.id || 0,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load rooms.');
    }
  }

  useEffect(() => {
    if (canRead) void load();
  }, [canRead]);

  function editRoom(room: Room) {
    setSelectedRoom(room);
    setForm({
      hotelId: room.hotelId,
      roomTypeId: room.roomTypeId,
      roomNumber: room.roomNumber,
      floor: room.floor ?? 1,
      roomStatus: room.roomStatus ?? 1,
      status: room.status ?? 1,
      notes: room.notes ?? '',
    });
  }

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const payload = { ...form, floor: Number(form.floor), roomStatus: Number(form.roomStatus), status: Number(form.status) };
      if (selectedRoom) {
        const updated = await api.updateRoom(selectedRoom.id, payload);
        setRooms((current) => current.map((room) => (room.id === updated.id ? updated : room)));
        setSelectedRoom(updated);
        setMessage('Room updated.');
      } else {
        const created = await api.createRoom(payload);
        setRooms((current) => [created, ...current]);
        setMessage('Room added.');
      }
      setForm((current) => ({ ...emptyForm, hotelId: current.hotelId, roomTypeId: current.roomTypeId }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save room.');
    }
  }

  async function deleteRoom(room: Room) {
    await api.deleteRoom(room.id);
    setRooms((current) => current.filter((item) => item.id !== room.id));
    if (selectedRoom?.id === room.id) setSelectedRoom(null);
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
      {message ? <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{selectedRoom ? `Update room ${selectedRoom.roomNumber}` : 'Add room'}</CardTitle>
            <CardDescription>{permissionLabel(selectedRoom ? canUpdate : canCreate)}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={saveRoom}>
            <select className={inputClass} value={form.hotelId} required onChange={(event) => setForm((value) => ({ ...value, hotelId: Number(event.target.value) }))}>
              {hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
            </select>
            <select className={inputClass} value={form.roomTypeId} required onChange={(event) => setForm((value) => ({ ...value, roomTypeId: Number(event.target.value) }))}>
              {roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name}</option>)}
            </select>
            <input className={inputClass} placeholder="Room number" required value={form.roomNumber} onChange={(event) => setForm((value) => ({ ...value, roomNumber: event.target.value }))} />
            <input className={inputClass} placeholder="Floor" type="number" value={form.floor ?? ''} onChange={(event) => setForm((value) => ({ ...value, floor: Number(event.target.value) }))} />
            <select className={inputClass} value={form.roomStatus} onChange={(event) => setForm((value) => ({ ...value, roomStatus: Number(event.target.value) }))}>
              <option value={1}>Available</option>
              <option value={2}>Occupied</option>
              <option value={3}>Maintenance</option>
              <option value={4}>Blocked</option>
            </select>
            <input className={`${inputClass} xl:col-span-2`} placeholder="Notes" value={form.notes ?? ''} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} />
            <div className="flex gap-2">
              <Button type="submit" variant="gold" disabled={selectedRoom ? !canUpdate : !canCreate}>
                <Save className="h-4 w-4" />
                {selectedRoom ? 'Update' : 'Add'}
              </Button>
              {selectedRoom ? <Button variant="outline" onClick={() => { setSelectedRoom(null); setForm(emptyForm); }}>Clear</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rooms</CardTitle>
            <CardDescription>View details, update room state, and remove rooms.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {rooms.length === 0 ? <p className="text-sm text-muted-foreground">No data available.</p> : null}
            {rooms.map((room) => (
              <div key={room.id} className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gold-100 p-3 text-gold-800 dark:bg-gold-500/15 dark:text-gold-100">
                      <BedDouble className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Room {room.roomNumber}</p>
                      <p className="text-sm text-muted-foreground">{room.roomTypeName} · {room.hotelName}</p>
                    </div>
                  </div>
                  <Badge variant={room.roomStatus === 1 ? 'success' : room.roomStatus === 2 ? 'gold' : 'warning'}>{roomStatusLabel(room.roomStatus)}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Floor {room.floor ?? '-'} · {room.notes || 'No notes'}</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => editRoom(room)}><Eye className="h-4 w-4" />View</Button>
                  <Button variant="ghost" size="icon" onClick={() => void deleteRoom(room)} disabled={!canDelete} aria-label="Delete room"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Room details</CardTitle>
            <CardDescription>{selectedRoom ? 'Selected room record from the API.' : 'Select a room to inspect it.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRoom ? (
              <div className="space-y-3 text-sm">
                <Detail label="Room number" value={selectedRoom.roomNumber} />
                <Detail label="Hotel" value={selectedRoom.hotelName} />
                <Detail label="Room type" value={selectedRoom.roomTypeName} />
                <Detail label="Floor" value={String(selectedRoom.floor ?? '-')} />
                <Detail label="Room status" value={roomStatusLabel(selectedRoom.roomStatus)} />
                <Detail label="Notes" value={selectedRoom.notes || '-'} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No room selected.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
