import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Save, Star, Trash2, Upload } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { BulkCreateRoomsPayload, HotelSummary, RoomType, UpsertRoomPayload } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { recordStatusOptions, roomStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';

const inputClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';

export function RoomFormPage() {
  const { id } = useParams();
  const roomId = id ? Number(id) : null;
  const isEdit = Boolean(roomId);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(session?.perms, 'rooms', 'create');
  const canUpdate = hasPermission(session?.perms, 'rooms', 'update');
  const canDelete = hasPermission(session?.perms, 'rooms', 'delete');
  const canReadRoomTypes = hasPermission(session?.perms, 'room-types', 'read');
  const canSave = (isEdit ? canUpdate : canCreate) && canReadRoomTypes;
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRoomNumbers, setBulkRoomNumbers] = useState('');
  const [form, setForm] = useState({
    hotelId: '',
    roomTypeId: '',
    roomNumber: '',
    floor: '',
    roomStatus: '1',
    status: '1',
    notes: '',
  });

  useEffect(() => {
    async function load() {
      if (!canReadRoomTypes) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const hotelList = await api.listHotels();
        setHotels(hotelList ?? []);

        if (roomId) {
          const room = await api.getRoom(roomId);
          setRoomTypes(await api.listRoomTypes(room.hotelId));
          setForm({
            hotelId: String(room.hotelId),
            roomTypeId: String(room.roomTypeId),
            roomNumber: room.roomNumber,
            floor: room.floor ? String(room.floor) : '',
            roomStatus: String(room.roomStatus ?? 1),
            status: String(room.status ?? 1),
            notes: room.notes ?? '',
          });
        } else {
          setForm((current) => ({
            ...current,
            hotelId: current.hotelId || String(hotelList?.[0]?.id ?? ''),
          }));
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load room form.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [canReadRoomTypes, roomId, showToast]);

  useEffect(() => {
    const hotelId = Number(form.hotelId);
    if (!canReadRoomTypes || !hotelId || isEdit && loading) return;
    let active = true;
    api.listRoomTypes(hotelId)
      .then((items) => {
        if (!active) return;
        setRoomTypes(items ?? []);
        setForm((current) => ({
          ...current,
          roomTypeId: items.some((item) => String(item.id) === current.roomTypeId)
            ? current.roomTypeId
            : String(items[0]?.id ?? ''),
        }));
      })
      .catch((err) => showToast(err instanceof Error ? err.message : 'Unable to load room types.', 'error'));
    return () => {
      active = false;
    };
  }, [canReadRoomTypes, form.hotelId, isEdit, loading, showToast]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const payload: UpsertRoomPayload = {
        hotelId: Number(form.hotelId),
        roomTypeId: Number(form.roomTypeId),
        roomNumber: form.roomNumber,
        floor: form.floor ? Number(form.floor) : undefined,
        roomStatus: Number(form.roomStatus),
        status: Number(form.status),
        notes: form.notes || undefined,
      };

      if (!isEdit && bulkMode) {
        const roomNumbers = bulkRoomNumbers
          .split(/[\n,]+/)
          .map((value) => value.trim())
          .filter(Boolean);
        const bulkPayload: BulkCreateRoomsPayload = {
          hotelId: payload.hotelId,
          roomTypeId: payload.roomTypeId,
          roomNumbers,
          floor: payload.floor,
          roomStatus: payload.roomStatus,
          status: payload.status,
          notes: payload.notes,
        };
        await api.createRooms(bulkPayload);
        showToast(`${roomNumbers.length} rooms added.`, 'success');
        navigate('/rooms');
        return;
      }

      if (isEdit && roomId) {
        await api.updateRoom(roomId, payload);
      } else {
        await api.createRoom(payload);
      }

      showToast(isEdit ? 'Room updated.' : 'Room added.', 'success');
      navigate('/rooms');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to save room.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FullPageLoader label={isEdit ? 'Loading room...' : 'Preparing room form...'} />;
  }

  if (!canReadRoomTypes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Room Types read permission is required to create or update rooms.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/rooms')}>
        <ArrowLeft className="h-4 w-4" />
        Back to rooms
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Update room' : 'Add room'}</CardTitle>
          <CardDescription>
            {isEdit ? 'Update room details and images.' : 'Create one room or add up to 500 rooms in a single request.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              {!isEdit ? (
                <div className="flex gap-2 md:col-span-2">
                  <Button type="button" variant={!bulkMode ? 'gold' : 'outline'} onClick={() => setBulkMode(false)}>
                    Single room
                  </Button>
                  <Button type="button" variant={bulkMode ? 'gold' : 'outline'} onClick={() => setBulkMode(true)}>
                    Bulk rooms
                  </Button>
                </div>
              ) : null}
              <label className="space-y-2 text-sm font-medium">
                Hotel
                <select className={inputClass} required value={form.hotelId} onChange={(event) => setForm((value) => ({ ...value, hotelId: event.target.value }))}>
                  <option value="">Select hotel</option>
                  {hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Room type
                <select className={inputClass} required value={form.roomTypeId} onChange={(event) => setForm((value) => ({ ...value, roomTypeId: event.target.value }))}>
                  <option value="">Select room type</option>
                  {roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name}</option>)}
                </select>
              </label>
              {bulkMode && !isEdit ? (
                <div className="space-y-4 md:col-span-2">
                  
                  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                      <label htmlFor="range-start" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start number</label>
                      <input id="range-start" type="number" placeholder="e.g. 101" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                      <label htmlFor="range-end" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End number</label>
                      <input id="range-end" type="number" placeholder="e.g. 110" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        const start = parseInt((document.getElementById('range-start') as HTMLInputElement)?.value, 10);
                        const end = parseInt((document.getElementById('range-end') as HTMLInputElement)?.value, 10);
                        if (!isNaN(start) && !isNaN(end) && start <= end && end - start <= 500) {
                          const range = Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
                          setBulkRoomNumbers(range.join(', '));
                        } else if (end - start > 500) {
                          showToast('Maximum range is 500 rooms at a time.', 'warning');
                        } else {
                          showToast('Please enter a valid start and end number.', 'warning');
                        }
                      }}
                    >
                      Generate range
                    </Button>
                  </div>
                  <label className="block space-y-2 text-sm font-medium">
                    Room numbers
                    <textarea
                      className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder={'101, 102, 103\nOr enter one room number per line'}
                      value={bulkRoomNumbers}
                      onChange={(event) => setBulkRoomNumbers(event.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <label className="space-y-2 text-sm font-medium">
                  Room number
                  <input className={inputClass} required value={form.roomNumber} onChange={(event) => setForm((value) => ({ ...value, roomNumber: event.target.value }))} />
                </label>
              )}
              <label className="space-y-2 text-sm font-medium">
                Floor
                <input className={inputClass} type="number" value={form.floor} onChange={(event) => setForm((value) => ({ ...value, floor: event.target.value }))} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Room status
                <select className={inputClass} value={form.roomStatus} onChange={(event) => setForm((value) => ({ ...value, roomStatus: event.target.value }))}>
                  {roomStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium md:col-span-2">
                Notes
                <input className={inputClass} value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} />
              </label>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" variant="gold" disabled={!canSave || saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : bulkMode && !isEdit ? 'Add rooms' : 'Save room'}
                </Button>
                <Link to="/rooms" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">
                  Cancel
                </Link>
              </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
