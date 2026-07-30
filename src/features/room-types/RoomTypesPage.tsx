import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { RoomType } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions, recordStatusTone } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';
import { Status } from '@/lib/constants';
import { sortRoomTypes } from '@/lib/room-types';
import { formatCurrency } from '@/lib/format';

function RoomTypeActions({
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
    <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="View">
        <Link to={`/room-types/${roomType.id}`} className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">View</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Edit" disabled={!canUpdate}>
        <Link
          to={canUpdate ? `/room-types/${roomType.id}/edit` : '#'}
          className="inline-flex items-center gap-2"
          onClick={(event) => {
            if (!canUpdate) event.preventDefault();
          }}
        >
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Edit</span>
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
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const items = await api.listRoomTypes();
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
    void load();
  }, [canRead]);

  const columns = useMemo<Array<DataTableColumn<RoomType>>>(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            {row.sortOrder != null ? (
              <p className="text-xs text-muted-foreground">Order #{row.sortOrder}</p>
            ) : null}
          </div>
        ),
      },
      { key: 'hotelName', header: 'Hotel' },
      {
        key: 'occupancy',
        header: 'Occupancy',
        render: (row) => `${row.maxAdults ?? 2} adults, ${row.maxChildren ?? 0} children`,
      },
      {
        key: 'basePrice',
        header: 'Base price',
        numeric: true,
        render: (row) => formatCurrency(row.basePrice),
      },
      {
        key: 'totalRooms',
        header: 'Rooms',
        numeric: true,
        render: (row) => row.totalRooms ?? 0,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge tone={recordStatusTone(row.status)}>{optionLabel(recordStatusOptions, row.status)}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <RoomTypeActions
            roomType={row}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDelete={(item) => void deleteRoomType(item)}
          />
        ),
      },
    ],
    [canUpdate, canDelete],
  );

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
    <div className="min-w-0 space-y-6 animate-fade-in-up">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <CardTitle>Room types</CardTitle>
            <CardDescription className="hidden sm:block">
              Manage hotel-specific room categories, occupancy, amenities, and base pricing.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Refresh" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="primary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Add room type" disabled={!canCreate}>
              <Link to="/room-types/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add room type</span>
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveList
            columns={columns}
            data={roomTypes}
            isLoading={loading}
            emptyState={<EmptyState />}
            renderMobileCard={(roomType) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-semibold">{roomType.name}</p>
                  <Badge tone={recordStatusTone(roomType.status)} className="shrink-0">
                    {optionLabel(recordStatusOptions, roomType.status)}
                  </Badge>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Hotel</dt>
                    <dd className="min-w-0 text-right text-foreground">{roomType.hotelName || '-'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Occupancy</dt>
                    <dd className="min-w-0 text-right text-foreground">
                      {roomType.maxAdults ?? 2} adults, {roomType.maxChildren ?? 0} children
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Base price</dt>
                    <dd className="min-w-0 text-right text-foreground">{formatCurrency(roomType.basePrice)} / night</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Rooms</dt>
                    <dd className="min-w-0 text-right text-foreground">{roomType.totalRooms ?? 0}</dd>
                  </div>
                </dl>
                <RoomTypeActions
                  roomType={roomType}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onDelete={(item) => void deleteRoomType(item)}
                />
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
