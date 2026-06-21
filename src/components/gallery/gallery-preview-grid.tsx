import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, GripVertical, Trash2 } from 'lucide-react';
import type { GalleryImage } from '@/lib/api-types';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { Status } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-muted/20 to-background p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Website preview</p>
          <p className="text-xs text-muted-foreground">
            {canUpdate
              ? 'Drag images to change how they appear on the public gallery.'
              : 'Preview of how images appear on the public website.'}
          </p>
        </div>
        {reordering ? (
          <Badge variant="secondary">Saving order...</Badge>
        ) : canUpdate ? (
          <Badge variant="outline">Drag to reorder</Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((image, index) => {
          const isDragging = draggingId === image.id;
          const isDropTarget = dropTargetId === image.id && draggingId !== image.id;

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
                'group relative overflow-hidden rounded-xl border bg-card shadow-sm transition',
                isDragging && 'scale-[0.98] opacity-50',
                isDropTarget && 'border-gold-400 ring-2 ring-gold-400/40',
                canUpdate && !reordering && 'cursor-grab active:cursor-grabbing',
              )}
            >
              <div className="aspect-[4/3] bg-muted">
                <img
                  src={image.publicUrl}
                  alt={image.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              </div>

              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
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
                <Badge variant={image.status === Status.ACTIVE ? 'success' : 'secondary'}>
                  {optionLabel(recordStatusOptions, image.status)}
                </Badge>
              </div>

              <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <div>
                  <p className="truncate text-sm font-medium text-white">{image.title}</p>
                  <p className="text-xs text-white/75">{image.category}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!canUpdate} asChild={canUpdate}>
                    {canUpdate ? (
                      <Link to={`/gallery/${image.id}/edit`} className="inline-flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canDelete}
                    onClick={() => onDelete(image)}
                    aria-label={`Delete ${image.title}`}
                    className="text-white hover:bg-white/10 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
