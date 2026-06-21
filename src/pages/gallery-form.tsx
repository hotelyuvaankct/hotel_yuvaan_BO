import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Save, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { UpsertGalleryImagePayload } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import {
  GalleryCategory,
  GALLERY_CATEGORIES,
  GALLERY_MAX_FILE_SIZE_BYTES,
  GALLERY_MAX_FILE_SIZE_LABEL,
  Status,
} from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';
import { SelectField, TextField } from '@/components/ui/form-fields';
import { optionLabel, recordStatusOptions } from '@/lib/enums';

type SelectedFile = {
  id: string;
  file: File;
  previewUrl: string;
};

export function GalleryFormPage() {
  const { id } = useParams();
  const imageId = id ? Number(id) : null;
  const isEdit = Boolean(imageId);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'gallery', 'read');
  const canCreate = hasPermission(session?.perms, 'gallery', 'create');
  const canUpdate = hasPermission(session?.perms, 'gallery', 'update');
  const canSave = isEdit ? canUpdate : canCreate;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    category: GalleryCategory.GENERAL,
    displayOrder: '',
    status: String(Status.ACTIVE),
  });

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        if (imageId) {
          const image = await api.getGalleryImage(imageId);
          setExistingUrl(image.publicUrl);
          setForm({
            title: image.title,
            category: image.category,
            displayOrder: String(image.displayOrder ?? 0),
            status: String(image.status ?? Status.ACTIVE),
          });
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load gallery form.', 'error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [canRead, imageId, navigate, showToast]);

  useEffect(() => {
    return () => {
      files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [files]);

  const totalUploadSizeLabel = useMemo(() => {
    const totalMb = files.reduce((sum, item) => sum + item.file.size, 0) / (1024 * 1024);
    return `${files.length} file${files.length === 1 ? '' : 's'} · ${totalMb.toFixed(2)} MB`;
  }, [files]);

  function handleFilesChange(selectedFiles: FileList | null) {
    if (!selectedFiles?.length) return;

    const accepted: SelectedFile[] = [];
    for (const nextFile of Array.from(selectedFiles)) {
      if (nextFile.size > GALLERY_MAX_FILE_SIZE_BYTES) {
        showToast(`"${nextFile.name}" exceeds ${GALLERY_MAX_FILE_SIZE_LABEL} and was skipped.`, 'error');
        continue;
      }
      accepted.push({
        id: `${nextFile.name}-${nextFile.size}-${nextFile.lastModified}`,
        file: nextFile,
        previewUrl: URL.createObjectURL(nextFile),
      });
    }

    if (!accepted.length) return;

    setFiles((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const merged = [...current];
      accepted.forEach((item) => {
        if (!existingIds.has(item.id)) {
          merged.push(item);
        }
      });
      return merged;
    });
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function clearFiles() {
    files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setFiles([]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    if (!isEdit && files.length === 0) {
      showToast('Please choose at least one image to upload.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && imageId) {
        const payload: UpsertGalleryImagePayload = {
          title: form.title.trim(),
          category: form.category.trim(),
          status: Number(form.status),
        };
        if (form.displayOrder.trim()) {
          payload.displayOrder = Number(form.displayOrder);
        }
        await api.updateGalleryImage(imageId, payload);
        showToast('Gallery image updated.', 'success');
      } else {
        const payload = {
          category: form.category.trim(),
          status: Number(form.status),
          ...(form.title.trim() ? { title: form.title.trim() } : {}),
          ...(form.displayOrder.trim() ? { displayOrder: Number(form.displayOrder) } : {}),
        };
        const uploaded = await api.uploadGalleryImages(
          payload,
          files.map((item) => item.file),
        );
        showToast(
          uploaded.length === 1
            ? 'Gallery image uploaded.'
            : `${uploaded.length} gallery images uploaded.`,
          'success',
        );
      }
      navigate('/gallery');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save gallery image.', 'error');
    } finally {
      setSaving(false);
    }
  }

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

  if (loading) return <FullPageLoader />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/gallery" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to gallery
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit gallery image' : 'Upload gallery images'}</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Update title, category, display order, or visibility on the public website.'
              : `Select one or more JPEG, PNG, WebP, or GIF images. Each file must be under ${GALLERY_MAX_FILE_SIZE_LABEL}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            {!isEdit ? (
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-medium">Image files</label>
                <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition hover:bg-muted/50">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Choose images</p>
                    <p className="text-xs text-muted-foreground">
                      Multiple files allowed · max {GALLERY_MAX_FILE_SIZE_LABEL} each
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      handleFilesChange(event.target.files);
                      event.target.value = '';
                    }}
                  />
                </label>

                {files.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">{totalUploadSizeLabel}</p>
                      <Button type="button" variant="ghost" size="sm" onClick={clearFiles}>
                        <X className="h-4 w-4" />
                        Clear all
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {files.map((item) => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-lg border border-border bg-card"
                        >
                          <div className="aspect-[4/3] bg-muted">
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2 p-3">
                            <p className="truncate text-sm">{item.file.name}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(item.id)}
                              aria-label={`Remove ${item.file.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isEdit && existingUrl ? (
              <div className="overflow-hidden rounded-xl border border-border md:col-span-2">
                <img
                  src={existingUrl}
                  alt={form.title || 'Gallery preview'}
                  className="max-h-72 w-full object-cover"
                />
              </div>
            ) : null}

            <TextField
              label={isEdit ? 'Title' : 'Title prefix (optional)'}
              wrapperClassName="md:col-span-2"
              value={form.title}
              required={isEdit}
              placeholder={
                isEdit
                  ? undefined
                  : 'Leave empty to use each file name as the title'
              }
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />

            <SelectField
              label="Category"
              value={form.category}
              options={GALLERY_CATEGORIES.map((category) => ({ value: category, label: category }))}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            />

            <TextField
              label="Display order"
              type="number"
              min={0}
              value={form.displayOrder}
              placeholder="Auto"
              onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
            />

            <SelectField
              label="Status"
              value={form.status}
              options={recordStatusOptions.map((option) => ({
                value: option.value,
                label: optionLabel(recordStatusOptions, option.value),
              }))}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            />

            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="outline" type="button" asChild>
                <Link to="/gallery">Cancel</Link>
              </Button>
              <Button variant="gold" type="submit" disabled={!canSave || saving}>
                <Save className="h-4 w-4" />
                {saving
                  ? 'Saving...'
                  : isEdit
                    ? 'Save changes'
                    : files.length > 1
                      ? `Upload ${files.length} images`
                      : 'Upload image'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
