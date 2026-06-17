import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { GalleryImage } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { SelectField } from '@/components/ui/form-fields';
import { GalleryPreviewGrid } from '@/components/gallery/gallery-preview-grid';
import {
  GALLERY_CATEGORY_FILTER_ALL,
  GALLERY_CATEGORY_FILTERS,
  GALLERY_MAX_FILE_SIZE_LABEL,
  type GalleryCategoryFilter,
} from '@/lib/constants';

const GALLERY_PAGE_SIZE = 100;

export function GalleryPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(session?.perms, 'gallery', 'create');
  const canRead = hasPermission(session?.perms, 'gallery', 'read');
  const canUpdate = hasPermission(session?.perms, 'gallery', 'update');
  const canDelete = hasPermission(session?.perms, 'gallery', 'delete');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<GalleryCategoryFilter>(GALLERY_CATEGORY_FILTER_ALL);

  async function load(activeCategory = categoryFilter) {
    setLoading(true);
    try {
      const result = await api.listGalleryImages({
        page: 0,
        size: GALLERY_PAGE_SIZE,
        category: activeCategory === GALLERY_CATEGORY_FILTER_ALL ? undefined : activeCategory,
      });
      setImages(result.content ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load gallery images.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteImage(image: GalleryImage) {
    const confirmed = await confirm({
      title: 'Delete gallery image?',
      description: `This will permanently remove "${image.title}" from the website gallery.`,
      confirmLabel: 'Delete image',
    });
    if (!confirmed) return;
    try {
      await api.deleteGalleryImage(image.id);
      showToast('Gallery image deleted.', 'success');
      await load(categoryFilter);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete gallery image.', 'error');
    }
  }

  async function handleReorder(orderedIds: number[]) {
    const previous = images;
    const nextImages = orderedIds
      .map((id, index) => {
        const image = images.find((item) => item.id === id);
        return image ? { ...image, displayOrder: index } : null;
      })
      .filter((image): image is GalleryImage => image != null);

    setImages(nextImages);
    setReordering(true);
    try {
      const updated = await api.reorderGalleryImages(orderedIds);
      setImages(updated);
      showToast('Gallery order saved.', 'success');
    } catch (err) {
      setImages(previous);
      showToast(err instanceof Error ? err.message : 'Unable to save gallery order.', 'error');
    } finally {
      setReordering(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    void load(categoryFilter);
  }, [canRead, categoryFilter]);

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your current role does not include read access for gallery.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Gallery</CardTitle>
            <CardDescription>
              Manage photos shown on the public website. Drag to reorder, then changes save automatically.
              Each image must be under {GALLERY_MAX_FILE_SIZE_LABEL}.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load(categoryFilter)} disabled={loading || reordering}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="gold" size="sm" disabled={!canCreate} asChild={canCreate}>
              {canCreate ? (
                <Link to="/gallery/new" className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Upload images
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Upload images
                </span>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectField
            variant="filter"
            wrapperClassName="max-w-sm"
            value={categoryFilter}
            options={GALLERY_CATEGORY_FILTERS.map((category) => ({
              value: category,
              label: category,
            }))}
            onChange={(event) => {
              setCategoryFilter(event.target.value as GalleryCategoryFilter);
            }}
          />

          {loading ? <LoadingState /> : null}
          {!loading && images.length === 0 ? <EmptyState /> : null}
          {!loading && images.length > 0 ? (
            <GalleryPreviewGrid
              images={images}
              canUpdate={canUpdate}
              canDelete={canDelete}
              reordering={reordering}
              onReorder={(orderedIds) => void handleReorder(orderedIds)}
              onDelete={(image) => void deleteImage(image)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
