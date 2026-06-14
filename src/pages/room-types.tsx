import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { HotelSummary, RoomType } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { SelectField } from '@/components/ui/form-fields';
import { Status } from '@/lib/constants';

export function RoomTypesPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(session?.perms, 'room-types', 'create');
  const canRead = hasPermission(session?.perms, 'room-types', 'read');
  const canUpdate = hasPermission(session?.perms, 'room-types', 'update');
  const canDelete = hasPermission(session?.perms, 'room-types', 'delete');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(activeHotelId = hotelId) {
    setLoading(true);
    try {
      setRoomTypes(await api.listRoomTypes(activeHotelId ? Number(activeHotelId) : undefined));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load room types.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteRoomType(roomType: RoomType) {
    const confirmed = await confirm({
      title: 'Delete room type?',
      description: `This will remove ${roomType.name}. Types assigned to active rooms cannot be deleted.`,
      confirmLabel: 'Delete room type',
    });
    if (!confirmed) return;
    try {
      await api.deleteRoomType(roomType.id);
      showToast('Room type deleted.', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete room type.', 'error');
    }
  }

  useEffect(() => {
    if (!canRead) return;
    void Promise.all([api.listHotels(), load()])
      .then(([hotelList]) => setHotels(hotelList ?? []))
      .catch(() => undefined);
  }, [canRead]);

  useEffect(() => {
    if (!canRead) return;
    const timeout = window.setTimeout(() => void load(hotelId), 250);
    return () => window.clearTimeout(timeout);
  }, [canRead, hotelId]);

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your current role does not include read access for room types.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Room types</CardTitle>
            <CardDescription>Manage hotel-specific room categories, occupancy, amenities, and base pricing.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="gold" size="sm" disabled={!canCreate} onClick={() => undefined}>
              <Link to="/room-types/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add room type
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectField
            variant="filter"
            wrapperClassName="max-w-sm"
            value={hotelId}
            placeholder="All hotels"
            options={hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))}
            onChange={(event) => setHotelId(event.target.value)}
          />

          <div className="overflow-x-auto">
            {loading ? <LoadingState /> : null}
            {!loading ? (
              <table className="w-full min-w-[900px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Hotel</th>
                    <th className="px-3 py-2 font-medium">Occupancy</th>
                    <th className="px-3 py-2 font-medium">Base price</th>
                    <th className="px-3 py-2 font-medium">Rooms</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.length === 0 ? (
                    <tr><td className="px-3 py-6" colSpan={7}><EmptyState /></td></tr>
                  ) : null}
                  {roomTypes.map((roomType) => (
                    <tr key={roomType.id} className="border-t border-border">
                      <td className="px-3 py-3">
                        <p className="font-medium">{roomType.name}</p>
                        <p className="text-xs text-muted-foreground">{roomType.description || '-'}</p>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{roomType.hotelName || '-'}</td>
                      <td className="px-3 py-3 text-muted-foreground">{roomType.maxAdults ?? 2} adults, {roomType.maxChildren ?? 0} children</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatCurrency(roomType.basePrice)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{roomType.totalRooms ?? 0}</td>
                      <td className="px-3 py-3">
                        <Badge variant={roomType.status === Status.ACTIVE ? 'success' : 'secondary'}>
                          {optionLabel(recordStatusOptions, roomType.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/room-types/${roomType.id}`} className="inline-flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" disabled={!canUpdate} asChild>
                            <Link to={canUpdate ? `/room-types/${roomType.id}/edit` : '#'} className="inline-flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canDelete || Boolean(roomType.totalRooms)}
                            onClick={() => void deleteRoomType(roomType)}
                            aria-label="Delete room type"
                          >
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
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}
