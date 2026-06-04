import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Room } from '@/lib/api-types';
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
import { PageToolbar } from '@/components/common/page-toolbar';

export function RoomsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(session?.perms, 'rooms', 'create');
  const canRead = hasPermission(session?.perms, 'rooms', 'read');
  const canUpdate = hasPermission(session?.perms, 'rooms', 'update');
  const canDelete = hasPermission(session?.perms, 'rooms', 'delete');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRooms(await api.listRooms());
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
      setRooms((current) => current.filter((item) => item.id !== room.id));
      showToast('Room deleted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete room.', 'error');
    }
  }

  useEffect(() => {
    if (canRead) void load();
  }, [canRead]);

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
      <PageToolbar
        title="Rooms"
        description="Listing table is loaded from the rooms API."
        actions={
          <>
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
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Room listing</CardTitle>
          <CardDescription>View, update, and remove rooms.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <LoadingState /> : null}
          {!loading ? (
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
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
                    <td className="px-3 py-6" colSpan={7}><EmptyState /></td>
                  </tr>
                ) : null}
                {rooms.map((room) => (
                  <tr key={room.id} className="border-t border-border">
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
        </CardContent>
      </Card>
    </div>
  );
}
