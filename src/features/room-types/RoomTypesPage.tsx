import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Edit, Eye, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { RoomType } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions, recordStatusTone } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { sortRoomTypes } from '@/lib/room-types';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';

function primaryImageUrl(roomType: RoomType) {
  const images = roomType.images ?? [];
  if (images.length === 0) return null;
  const sorted = [...images].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id,
  );
  return (sorted.find((image) => image.primary) ?? sorted[0])?.publicUrl ?? null;
}

function RoomTypeCatalogCard({
  row,
  canUpdate,
  canDelete,
  onDelete,
}: {
  row: RoomType;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (roomType: RoomType) => void;
}) {
  const thumb = primaryImageUrl(row);
  const adults = row.maxAdults ?? 2;
  const children = row.maxChildren ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <BedDouble className="h-6 w-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold tracking-tight text-foreground">{row.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {row.hotelName || 'Hotel'}
                {row.sortOrder != null ? ` · Order #${row.sortOrder}` : ''}
              </p>
            </div>
            <Badge tone={recordStatusTone(row.status)} className="shrink-0">
              {optionLabel(recordStatusOptions, row.status)}
            </Badge>
          </div>

          <p className="text-base font-semibold tabular-nums tracking-tight text-foreground">
            {formatCurrency(row.basePrice)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/ night</span>
          </p>

          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden />
              {adults} adults{children > 0 ? `, ${children} children` : ''}
            </span>
            <span aria-hidden>·</span>
            <span>{row.totalRooms ?? 0} rooms</span>
          </div>
        </div>
      </div>

      <RoomTypeActions
        roomType={row}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onDelete={onDelete}
      />
    </div>
  );
}

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
  const navigate = useNavigate();
  const roomCount = roomType.totalRooms ?? 0;

  return (
    <div className="flex flex-nowrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="outline"
        size="sm"
        className="h-9 shrink-0 px-3"
        aria-label="View"
        leftIcon={<Eye className="h-4 w-4" />}
        onClick={() => navigate(`/room-types/${roomType.id}`)}
      >
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9 shrink-0 px-3"
        aria-label="Edit"
        disabled={!canUpdate}
        leftIcon={<Edit className="h-4 w-4" />}
        onClick={() => navigate(`/room-types/${roomType.id}/edit`)}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
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
  const navigate = useNavigate();
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
        header: 'Room type',
        render: (row) => {
          const thumb = primaryImageUrl(row);
          return (
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <BedDouble className="h-4 w-4" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{row.name}</p>
                {row.sortOrder != null ? (
                  <p className="text-xs text-muted-foreground">Order #{row.sortOrder}</p>
                ) : null}
              </div>
            </div>
          );
        },
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
              Categories guests book — occupancy, amenities, images, and base pricing.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 px-0 sm:w-auto sm:px-3"
              aria-label="Refresh"
              onClick={() => void load()}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="h-9 w-9 shrink-0 px-0 sm:w-auto sm:px-3"
              aria-label="Add room type"
              disabled={!canCreate}
              onClick={() => navigate('/room-types/new')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add room type</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveList
            columns={columns}
            data={roomTypes}
            isLoading={loading}
            emptyState={<EmptyState label="No room types yet." />}
            onRowClick={(row) => navigate(`/room-types/${row.id}`)}
            renderMobileCard={(roomType) => (
              <RoomTypeCatalogCard
                row={roomType}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onDelete={(item) => void deleteRoomType(item)}
              />
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
