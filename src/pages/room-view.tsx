import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { api } from '@/lib/api';
import type { Room } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions, roomStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';

export function RoomViewPage() {
  const { id } = useParams();
  const roomId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'rooms', 'read');
  const canUpdate = hasPermission(session?.perms, 'rooms', 'update');
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead || !roomId) return;
    api.getRoom(roomId)
      .then(setRoom)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Unable to load room details.', 'error'))
      .finally(() => setLoading(false));
  }, [canRead, roomId, showToast]);

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

  if (loading) return <FullPageLoader label="Loading room details..." />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/rooms')}>
        <ArrowLeft className="h-4 w-4" />
        Back to rooms
      </Button>

      {!room ? <EmptyState label="No room details found." /> : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Room {room.roomNumber}</h1>
              <p className="text-sm text-muted-foreground">{room.hotelName} · {room.roomTypeName}</p>
            </div>
            {canUpdate ? (
              <Button variant="gold" size="sm" onClick={() => undefined}>
                <Link to={`/rooms/${room.id}/edit`} className="inline-flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Update room
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Room details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DetailRow label="Hotel" value={room.hotelName} />
                <DetailRow label="Room type" value={room.roomTypeName} />
                <DetailRow label="Floor" value={room.floor == null ? '-' : String(room.floor)} />
                <DetailRow label="Room status" value={optionLabel(roomStatusOptions, room.roomStatus)} />
                <DetailRow label="Record status" value={optionLabel(recordStatusOptions, room.status)} />
                <DetailRow label="Notes" value={room.notes || '-'} />
                <DetailRow label="Created" value={formatDate(room.createdAt)} />
                <DetailRow label="Updated" value={formatDate(room.updatedAt)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Room images</CardTitle>
                <CardDescription>{room.images?.length ?? 0} image{room.images?.length === 1 ? '' : 's'} available.</CardDescription>
              </CardHeader>
              <CardContent>
                {!room.images?.length ? <EmptyState label="No room images." /> : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {room.images.map((image) => (
                      <div key={image.id} className="overflow-hidden rounded-xl border border-border">
                        <img src={image.publicUrl} alt={`Room ${room.roomNumber}`} className="h-52 w-full object-cover" />
                        {image.primary ? <div className="p-2"><Badge variant="gold">Primary</Badge></div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
