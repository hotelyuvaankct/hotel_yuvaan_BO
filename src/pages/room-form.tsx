import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { HotelSummary, RoomType, UpsertRoomPayload } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { recordStatusOptions, roomStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';

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
  const canSave = isEdit ? canUpdate : canCreate;
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setLoading(true);
      try {
        const [hotelList, roomTypeList] = await Promise.all([api.listHotels(), api.listRoomTypes()]);
        setHotels(hotelList ?? []);
        setRoomTypes(roomTypeList ?? []);

        if (roomId) {
          const room = await api.getRoom(roomId);
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
            roomTypeId: current.roomTypeId || String(roomTypeList?.[0]?.id ?? ''),
          }));
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load room form.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [roomId, showToast]);

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/rooms')}>
        <ArrowLeft className="h-4 w-4" />
        Back to rooms
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Update room' : 'Add room'}</CardTitle>
          <CardDescription>Room status and record status use backend enum values.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
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
              <label className="space-y-2 text-sm font-medium">
                Room number
                <input className={inputClass} required value={form.roomNumber} onChange={(event) => setForm((value) => ({ ...value, roomNumber: event.target.value }))} />
              </label>
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
              <label className="space-y-2 text-sm font-medium">
                Record status
                <select className={inputClass} value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>
                  {recordStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium md:col-span-2">
                Notes
                <input className={inputClass} value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} />
              </label>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" variant="gold" disabled={!canSave || saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save room'}
                </Button>
                <Link to="/rooms" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
