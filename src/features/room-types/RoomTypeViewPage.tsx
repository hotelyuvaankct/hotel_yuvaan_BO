import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, Check, Edit, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import type { RoomImage, RoomType, RoomTypeRatePlan } from '@/lib/api-types';
import { getAmenityIcon, getAmenityLabel, parseAmenities } from '@/lib/amenities';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions, recordStatusTone } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useBreadcrumbLabel } from '@/components/common/breadcrumb-labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SoftFact } from '@/components/ui/soft-fact';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';

function sortImages(images: RoomImage[]) {
  return [...images].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
}

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
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'room-types', 'read');
  const canUpdate = hasPermission(session?.perms, 'room-types', 'update');
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

  const crumbPath = id ? `/room-types/${id}` : undefined;
  useBreadcrumbLabel(crumbPath, roomType?.name);
  useBreadcrumbLabel(id, roomType?.name);

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
    api
      .getRoomType(roomTypeId)
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
        <Card>
          <CardHeader>
            <CardTitle>Room type details</CardTitle>
            <CardDescription>Room type information, amenities, and rate plans.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState label="No room type details found." />
          </CardContent>
        </Card>
      </div>
    );
  }

  const adults = roomType.maxAdults ?? 0;
  const children = roomType.maxChildren ?? 0;

  return (
    <div className="min-w-0 space-y-6 animate-fade-in-up">
      {/* Catalog hero */}
      <Card className="min-w-0 overflow-hidden" padding="none">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {roomType.name}
                </h1>
                <Badge tone={recordStatusTone(roomType.status)}>
                  {optionLabel(recordStatusOptions, roomType.status)}
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{roomType.hotelName || 'Hotel'}</span>
                {roomType.sortOrder != null ? (
                  <span className="text-muted-foreground/80">· Order #{roomType.sortOrder}</span>
                ) : null}
              </p>
            </div>
            {canUpdate ? (
              <Button variant="primary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Edit room type">
                <Link to={`/room-types/${roomType.id}/edit`} className="inline-flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <ImageGallery
            roomName={roomType.name}
            images={images}
            selected={selectedImage}
            onSelect={setSelectedImageId}
          />

          <div className="space-y-4 border-t border-border p-4 sm:p-6 lg:border-l lg:border-t-0">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Base price
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatCurrency(roomType.basePrice)}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">/ night</span>
              </p>
            </div>

            {roomType.description ? (
              <p className="text-sm leading-relaxed text-foreground/80">{roomType.description}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <SoftFact
                label="Adults"
                value={`${adults}`}
              />
              <SoftFact
                label="Children"
                value={`${children}`}
              />
              <SoftFact
                label="Rooms"
                value={`${roomType.totalRooms ?? 0}`}
              />
              <SoftFact
                label="Images"
                value={`${images.length}`}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Amenities */}
      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
          <CardDescription>Facilities shown to guests for this category.</CardDescription>
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
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    {getAmenityLabel(amenity)}
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate plans */}
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ratePlans.map((plan) => (
                <RatePlanCard key={plan.id ?? plan.code} plan={plan} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
      <div className="flex min-h-[240px] items-center justify-center bg-muted/30 p-6 sm:min-h-[320px]">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="mx-auto h-8 w-8 opacity-50" aria-hidden />
          <p className="mt-2 text-sm">No images uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="relative overflow-hidden rounded-xl bg-muted">
        <img
          src={selected?.publicUrl}
          alt={roomName}
          className="aspect-[16/10] w-full object-cover"
        />
        {selected?.primary ? (
          <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm">
            Primary
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
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
                    ? 'border-brand ring-2 ring-brand/30'
                    : 'border-border hover:border-brand/40',
                )}
                aria-label={`Show image ${image.displayOrder + 1}`}
                aria-pressed={isSelected}
              >
                <img src={image.publicUrl} alt="" className="aspect-[16/10] w-full object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function RatePlanCard({ plan }: { plan: RoomTypeRatePlan }) {
  const occupancy = [...(plan.occupancyPrices ?? [])].sort((a, b) => a.guestCount - b.guestCount);
  const fromPrice = occupancy[0]?.price;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold tracking-tight text-foreground">{plan.label}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{plan.code}</p>
        </div>
        {plan.isDefault ? (
          <Badge tone="info" className="shrink-0">
            Default
          </Badge>
        ) : null}
      </div>

      {plan.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
      ) : null}

      {fromPrice != null ? (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">From </span>
          <span className="font-semibold tabular-nums">{formatCurrency(fromPrice)}</span>
          <span className="text-xs text-muted-foreground"> / night</span>
        </p>
      ) : null}

      {occupancy.length > 0 ? (
        <ul className="mt-3 space-y-1.5 rounded-xl bg-muted/40 p-2.5">
          {occupancy.map((item) => (
            <li key={item.guestCount} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {item.guestCount} guest{item.guestCount === 1 ? '' : 's'}
              </span>
              <span className="font-medium tabular-nums">{formatCurrency(item.price)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {(plan.features?.length ?? 0) > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {plan.features!.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
