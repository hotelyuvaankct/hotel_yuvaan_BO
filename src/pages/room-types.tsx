import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Edit, Eye, IndianRupee, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
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
import { sortRoomTypes } from '@/lib/room-types';

function formatCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

function RoomTypeCard({
  roomType,
  canUpdate,
  canDelete,
  onDelete,
}: {
  roomType: RoomType;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (roomType: RoomType) => void;
}) {
  const roomCount = roomType.totalRooms ?? 0;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/70 bg-background p-4 shadow-[0_4px_16px_rgb(0,0,0,0.03)] transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">{roomType.name}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {roomType.description || 'No description'}
          </p>
          {roomType.sortOrder != null ? (
            <p className="mt-1 text-xs font-medium text-primary">Order #{roomType.sortOrder}</p>
          ) : null}
        </div>
        <Badge
          variant={roomType.status === Status.ACTIVE ? 'success' : 'secondary'}
          className="shrink-0"
        >
          {optionLabel(recordStatusOptions, roomType.status)}
        </Badge>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{roomType.hotelName || '-'}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          <span>
            {roomType.maxAdults ?? 2} adults, {roomType.maxChildren ?? 0} children
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <IndianRupee className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium text-foreground">{formatCurrency(roomType.basePrice)}</span>
            <span className="text-xs"> / night</span>
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{roomCount}</span>
          {' '}room{roomCount === 1 ? '' : 's'}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => undefined}>
            <Link to={`/room-types/${roomType.id}`} className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled={!canUpdate} onClick={() => undefined}>
            <Link
              to={canUpdate ? `/room-types/${roomType.id}/edit` : '#'}
              className="inline-flex items-center gap-2"
              onClick={(event) => {
                if (!canUpdate) event.preventDefault();
              }}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canDelete || roomCount > 0}
            onClick={() => onDelete(roomType)}
            aria-label="Delete room type"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}

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
      const items = await api.listRoomTypes(activeHotelId ? Number(activeHotelId) : undefined);
      setRoomTypes(sortRoomTypes(items ?? []));
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
            <CardDescription>
              Manage hotel-specific room categories, occupancy, amenities, and base pricing.
            </CardDescription>
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

          {loading ? <LoadingState /> : null}
          {!loading && roomTypes.length === 0 ? <EmptyState /> : null}
          {!loading && roomTypes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {roomTypes.map((roomType) => (
                <RoomTypeCard
                  key={roomType.id}
                  roomType={roomType}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onDelete={(item) => void deleteRoomType(item)}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
