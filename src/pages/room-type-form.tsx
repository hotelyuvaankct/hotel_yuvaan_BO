import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { HotelSummary, UpsertRoomTypePayload } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';

const inputClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';

export function RoomTypeFormPage() {
  const { id } = useParams();
  const roomTypeId = id ? Number(id) : null;
  const isEdit = Boolean(roomTypeId);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'room-types', 'read');
  const canCreate = hasPermission(session?.perms, 'room-types', 'create');
  const canUpdate = hasPermission(session?.perms, 'room-types', 'update');
  const canSave = isEdit ? canUpdate : canCreate;
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    hotelId: '',
    name: '',
    description: '',
    maxAdults: '2',
    maxChildren: '0',
    basePrice: '',
    amenities: '',
    status: '1',
  });

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const hotelList = await api.listHotels();
        setHotels(hotelList ?? []);
        if (roomTypeId) {
          const roomType = await api.getRoomType(roomTypeId);
          setForm({
            hotelId: String(roomType.hotelId),
            name: roomType.name,
            description: roomType.description ?? '',
            maxAdults: String(roomType.maxAdults ?? 2),
            maxChildren: String(roomType.maxChildren ?? 0),
            basePrice: String(roomType.basePrice ?? ''),
            amenities: parseAmenities(roomType.amenities).join(', '),
            status: String(roomType.status ?? 1),
          });
        } else {
          setForm((current) => ({ ...current, hotelId: String(hotelList[0]?.id ?? '') }));
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load room type form.', 'error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [canRead, roomTypeId, showToast]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const amenities = form.amenities.split(',').map((value) => value.trim()).filter(Boolean);
    const payload: UpsertRoomTypePayload = {
      hotelId: Number(form.hotelId),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      maxAdults: Number(form.maxAdults),
      maxChildren: Number(form.maxChildren),
      basePrice: Number(form.basePrice),
      amenities: JSON.stringify(amenities),
      status: Number(form.status),
    };
    try {
      if (isEdit && roomTypeId) {
        await api.updateRoomType(roomTypeId, payload);
      } else {
        await api.createRoomType(payload);
      }
      showToast(isEdit ? 'Room type updated.' : 'Room type added.', 'success');
      navigate('/room-types');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to save room type.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FullPageLoader label={isEdit ? 'Loading room type...' : 'Preparing room type form...'} />;

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Room Types read permission is required to use this form.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/room-types')}>
        <ArrowLeft className="h-4 w-4" />
        Back to room types
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Update room type' : 'Add room type'}</CardTitle>
          <CardDescription>Room types belong to one hotel and drive room occupancy and pricing defaults.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="space-y-2 text-sm font-medium">
              Hotel
              <select className={inputClass} required value={form.hotelId} onChange={(event) => setForm((value) => ({ ...value, hotelId: event.target.value }))}>
                <option value="">Select hotel</option>
                {hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Name
              <input className={inputClass} required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Maximum adults
              <input className={inputClass} required min="1" type="number" value={form.maxAdults} onChange={(event) => setForm((value) => ({ ...value, maxAdults: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Maximum children
              <input className={inputClass} required min="0" type="number" value={form.maxChildren} onChange={(event) => setForm((value) => ({ ...value, maxChildren: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Base price
              <input className={inputClass} required min="0" step="0.01" type="number" value={form.basePrice} onChange={(event) => setForm((value) => ({ ...value, basePrice: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Status
              <select className={inputClass} value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>
                {recordStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium md:col-span-2">
              Description
              <input className={inputClass} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-medium md:col-span-2">
              Amenities
              <input className={inputClass} placeholder="Wi-Fi, Air conditioning, Television" value={form.amenities} onChange={(event) => setForm((value) => ({ ...value, amenities: event.target.value }))} />
              <span className="block text-xs font-normal text-muted-foreground">Separate amenities with commas.</span>
            </label>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" variant="gold" disabled={!canSave || saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save room type'}
              </Button>
              <Link to="/room-types" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">Cancel</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function parseAmenities(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
