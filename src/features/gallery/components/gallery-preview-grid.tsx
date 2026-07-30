import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, GripVertical, Trash2 } from 'lucide-react';
import type { GalleryImage } from '@/lib/api-types';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { Status } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type GalleryPreviewGridProps = {
  images: GalleryImage[];
  canUpdate: boolean;
  canDelete: boolean;
  reordering: boolean;
  onReorder: (orderedIds: number[]) => void;
  onDelete: (image: GalleryImage) => void;
};

function reorderImages(images: GalleryImage[], fromId: number, toId: number) {
  const fromIndex = images.findIndex((image) => image.id === fromId);
  const toIndex = images.findIndex((image) => image.id === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return images;
  }

  const next = [...images];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function GalleryPreviewGrid({
  images,
  canUpdate,
  canDelete,
  reordering,
  onReorder,
  onDelete,
}: GalleryPreviewGridProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);

  function handleDrop(targetId: number) {
    if (draggingId == null || draggingId === targetId || !canUpdate || reordering) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }

    const nextImages = reorderImages(images, draggingId, targetId);
    setDraggingId(null);
    setDropTargetId(null);
    onReorder(nextImages.map((image) => image.id));
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-2 sm:rounded-2xl sm:bg-gradient-to-b sm:from-muted/20 sm:to-background sm:p-6">
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-4">
        <p className="text-sm font-medium">Website preview</p>
        {reordering ? (
          <Badge variant="secondary">Saving…</Badge>
        ) : canUpdate ? (
          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            Drag to reorder
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((image, index) => {
          const isDragging = draggingId === image.id;
          const isDropTarget = dropTargetId === image.id && draggingId !== image.id;
          const isActive = image.status === Status.ACTIVE;

          return (
            <article
              key={image.id}
              draggable={canUpdate && !reordering}
              onDragStart={() => setDraggingId(image.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onDragOver={(event) => {
                if (!canUpdate || reordering) return;
                event.preventDefault();
                setDropTargetId(image.id);
              }}
              onDragLeave={() => {
                if (dropTargetId === image.id) {
                  setDropTargetId(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(image.id);
              }}
              className={cn(
                'group relative overflow-hidden rounded-lg border bg-card shadow-sm transition sm:rounded-xl',
                isDragging && 'scale-[0.98] opacity-50',
                isDropTarget && 'border-gold-400 ring-2 ring-gold-400/40',
                canUpdate && !reordering && 'cursor-grab active:cursor-grabbing',
              )}
            >
              <div className="aspect-square bg-muted sm:aspect-[4/3]">
                <img
                  src={image.publicUrl}
                  alt={image.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              </div>

              {/* Mobile: compact chrome — order + status dot only */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1 sm:hidden">
                <span className="rounded bg-black/55 px-1 py-px text-[10px] font-medium leading-none text-white">
                  #{index + 1}
                </span>
                <span
                  className={cn(
                    'mt-0.5 h-2 w-2 rounded-full ring-1 ring-white/80',
                    isActive ? 'bg-emerald-500' : 'bg-zinc-400',
                  )}
                  title={optionLabel(recordStatusOptions, image.status)}
                  aria-label={optionLabel(recordStatusOptions, image.status)}
                />
              </div>

              {/* Desktop: fuller overlay */}
              <div className="absolute inset-x-0 top-0 hidden items-start justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100 sm:flex">
                <div className="flex items-center gap-1">
                  {canUpdate ? (
                    <span className="inline-flex rounded-md bg-black/40 p-1 text-white">
                      <GripVertical className="h-4 w-4" />
                    </span>
                  ) : null}
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    #{index + 1}
                  </Badge>
                </div>
                <Badge variant={isActive ? 'success' : 'secondary'}>
                  {optionLabel(recordStatusOptions, image.status)}
                </Badge>
              </div>

              {/* Mobile actions: tiny icon chips in corner */}
              <div className="absolute bottom-1 right-1 flex gap-0.5 sm:hidden">
                {canUpdate ? (
                  <Link
                    to={`/gallery/${image.id}/edit`}
                    aria-label={`Edit ${image.title}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-sm"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Edit className="h-3 w-3" />
                  </Link>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    aria-label={`Delete ${image.title}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white backdrop-blur-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(image);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : null}
              </div>

              {/* Desktop bottom overlay */}
              <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 opacity-0 transition group-hover:opacity-100 sm:block">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{image.title}</p>
                    <p className="truncate text-xs text-white/75">{image.category}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canUpdate ? (
                      <Link
                        to={`/gallery/${image.id}/edit`}
                        aria-label={`Edit ${image.title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 bg-white/95 text-foreground transition-colors hover:bg-white"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        aria-label={`Delete ${image.title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(image);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
