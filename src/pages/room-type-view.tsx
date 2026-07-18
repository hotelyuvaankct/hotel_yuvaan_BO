import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Check,
  Edit,
  ImageIcon,
  IndianRupee,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { RoomImage, RoomType, RoomTypeRatePlan } from '@/lib/api-types';
import { getAmenityIcon, getAmenityLabel, parseAmenities } from '@/lib/amenities';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { Status } from '@/lib/constants';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';
import { cn } from '@/lib/utils';

function formatCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function sortImages(images: RoomImage[]) {
  return [...images].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
}

/** Prefer API primary flag; otherwise first by display order. */
function resolvePrimaryImage(images: RoomImage[]) {
  const sorted = sortImages(images);
  if (sorted.length === 0) return null;
  return sorted.find((image) => image.primary) ?? sorted[0];
}

function sortRatePlans(plans: RoomTypeRatePlan[]) {
  return [...plans].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0));
}

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
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

  const images = useMemo(() => sortImages(roomType?.images ?? []), [roomType?.images]);
  const primaryImage = useMemo(() => resolvePrimaryImage(images), [images]);
  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? primaryImage,
    [images, primaryImage, selectedImageId],
  );
  const amenities = useMemo(() => parseAmenities(roomType?.amenities), [roomType?.amenities]);
  const ratePlans = useMemo(() => sortRatePlans(roomType?.ratePlans ?? []), [roomType?.ratePlans]);

  useEffect(() => {
    if (!canRead || !roomTypeId) return;
    setLoading(true);
    api.getRoomType(roomTypeId)
      .then((data) => {
        setRoomType(data);
        const primary = resolvePrimaryImage(data.images ?? []);
        setSelectedImageId(primary?.id ?? null);
      })
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

  if (!roomType) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Button variant="ghost" onClick={() => navigate('/room-types')}>
          <ArrowLeft className="h-4 w-4" />
          Back to room types
        </Button>
        <EmptyState label="No room type details found." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/room-types')}>
          <ArrowLeft className="h-4 w-4" />
          Back to room types
        </Button>
        {canUpdate ? (
          <Button variant="gold" size="sm" onClick={() => undefined}>
            <Link to={`/room-types/${roomType.id}/edit`} className="inline-flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Update room type
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <ImageGallery
          roomName={roomType.name}
          images={images}
          selected={selectedImage}
          onSelect={setSelectedImageId}
        />

        <Card className="h-fit">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-2xl">{roomType.name}</CardTitle>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{roomType.hotelName || '-'}</span>
                </p>
              </div>
              <Badge variant={roomType.status === Status.ACTIVE ? 'success' : 'secondary'}>
                {optionLabel(recordStatusOptions, roomType.status)}
              </Badge>
            </div>
            {roomType.description ? (
              <CardDescription className="text-sm leading-relaxed text-foreground/80">
                {roomType.description}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile
                icon={IndianRupee}
                label="Base price"
                value={formatCurrency(roomType.basePrice)}
                hint="per night"
              />
              <StatTile
                icon={Users}
                label="Occupancy"
                value={`${roomType.maxAdults ?? 0} adults`}
                hint={`${roomType.maxChildren ?? 0} children`}
              />
              <StatTile
                icon={BedDouble}
                label="Rooms"
                value={String(roomType.totalRooms ?? 0)}
                hint="assigned to this type"
              />
              <StatTile
                icon={ImageIcon}
                label="Images"
                value={String(images.length)}
                hint="uploaded"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
          <CardDescription>Facilities available in this room type.</CardDescription>
        </CardHeader>
        <CardContent>
          {amenities.length === 0 ? (
            <EmptyState label="No amenities configured." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => {
                const Icon = getAmenityIcon(amenity);
                return (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {getAmenityLabel(amenity)}
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate plans</CardTitle>
          <CardDescription>
            {ratePlans.length} plan{ratePlans.length === 1 ? '' : 's'} linked to this room type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ratePlans.length === 0 ? (
            <EmptyState label="No rate plans configured." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ratePlans.map((plan) => (
                <RatePlanCard key={plan.id ?? plan.code} plan={plan} basePrice={roomType.basePrice} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ImageGallery({
  roomName,
  images,
  selected,
  onSelect,
}: {
  roomName: string;
  images: RoomImage[];
  selected: RoomImage | null;
  onSelect: (id: number) => void;
}) {
  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[280px] items-center justify-center p-6">
          <EmptyState label="No room type images." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="relative overflow-hidden rounded-xl bg-muted">
          <img
            src={selected?.publicUrl}
            alt={roomName}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((image) => {
            const isSelected = selected?.id === image.id;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelect(image.id)}
                className={cn(
                  'group relative overflow-hidden rounded-lg border transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/40'
                    : 'border-border hover:border-primary/40',
                )}
                aria-label={`Show image ${image.displayOrder + 1}`}
                aria-pressed={isSelected}
              >
                <img
                  src={image.publicUrl}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RatePlanCard({ plan, basePrice }: { plan: RoomTypeRatePlan; basePrice?: number }) {
  const total =
    basePrice != null && plan.extraPrice != null
      ? basePrice + plan.extraPrice
      : undefined;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold tracking-tight">{plan.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{plan.code}</p>
        </div>
      </div>

      {plan.description ? (
        <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
      ) : null}

      <div className="mt-3 space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Extra </span>
          <span className="font-medium">{formatCurrency(plan.extraPrice ?? 0)}</span>
        </p>
        {total != null ? (
          <p>
            <span className="text-muted-foreground">From </span>
            <span className="font-semibold">{formatCurrency(total)}</span>
            <span className="text-xs text-muted-foreground"> / night</span>
          </p>
        ) : null}
      </div>

      {(plan.features?.length ?? 0) > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-border/70 pt-3">
          {plan.features!.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
