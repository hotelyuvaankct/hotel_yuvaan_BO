import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { api } from '@/lib/api';
import type { RoomType } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';

export function RoomTypeViewPage() {
  const { id } = useParams();
  const roomTypeId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'room-types', 'read');
  const canUpdate = hasPermission(session?.perms, 'room-types', 'update');
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead || !roomTypeId) return;
    api.getRoomType(roomTypeId)
      .then(setRoomType)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Unable to load room type details.', 'error'))
      .finally(() => setLoading(false));
  }, [canRead, roomTypeId, showToast]);

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

  if (loading) return <FullPageLoader label="Loading room type details..." />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/room-types')}>
        <ArrowLeft className="h-4 w-4" />
        Back to room types
      </Button>

      {!roomType ? <EmptyState label="No room type details found." /> : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{roomType.name}</h1>
              <p className="text-sm text-muted-foreground">{roomType.hotelName}</p>
            </div>
            {canUpdate ? (
              <Button variant="gold" size="sm" onClick={() => undefined}>
                <Link to={`/room-types/${roomType.id}/edit`} className="inline-flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Update room type
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Room type details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DetailRow label="Hotel" value={roomType.hotelName ?? '-'} />
                <DetailRow label="Base price" value={roomType.basePrice != null ? `${roomType.basePrice}` : '-'} />
                <DetailRow label="Max adults" value={roomType.maxAdults != null ? String(roomType.maxAdults) : '-'} />
                <DetailRow label="Max children" value={roomType.maxChildren != null ? String(roomType.maxChildren) : '-'} />
                <DetailRow label="Total rooms" value={roomType.totalRooms != null ? String(roomType.totalRooms) : '-'} />
                <DetailRow label="Record status" value={optionLabel(recordStatusOptions, roomType.status)} />
                <DetailRow label="Description" value={roomType.description || '-'} />
                <DetailRow label="Amenities" value={parseAmenities(roomType.amenities).join(', ') || '-'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Room type images</CardTitle>
                <CardDescription>{roomType.images?.length ?? 0} image{roomType.images?.length === 1 ? '' : 's'} available.</CardDescription>
              </CardHeader>
              <CardContent>
                {!roomType.images?.length ? <EmptyState label="No room type images." /> : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {roomType.images.map((image) => (
                      <div key={image.id} className="overflow-hidden rounded-xl border border-border">
                        <img src={image.publicUrl} alt={`${roomType.name}`} className="h-52 w-full object-cover" />
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

function parseAmenities(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
