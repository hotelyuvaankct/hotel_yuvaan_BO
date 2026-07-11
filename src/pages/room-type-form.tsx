import { createPortal } from 'react-dom';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { HotelSummary, UpsertRoomTypePayload, RoomImage, RoomTypeRatePlan } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { Status } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';
import { SelectField, TextField, inputClass } from '@/components/ui/form-fields';
import { AMENITY_GROUPS, normalizeAmenity, parseAmenities } from '@/lib/amenities';
import { RATE_PLAN_OPTIONS } from '@/lib/rate-plans';

type VariantDraft = {
  id?: number;
  code: string;
  label: string;
  description: string;
  featuresText: string;
  extraPrice: string;
  isDefault: boolean;
};

const DEFAULT_VARIANTS: VariantDraft[] = [
  {
    code: 'ROOM_ONLY',
    label: 'Room Only',
    description: 'Just the room, no meals included.',
    featuresText: 'Cancellation policy, Payment: bank card, Hot Water Swimming Pool',
    extraPrice: '0',
    isDefault: true,
  },
  {
    code: 'WITH_BREAKFAST',
    label: 'Room With Complimentary Breakfast',
    description: 'Includes breakfast for the room occupants.',
    featuresText: 'Breakfast, Cancellation policy, Payment: bank card, Hot Water Swimming Pool',
    extraPrice: '',
    isDefault: false,
  },
  {
    code: 'WITH_BREAKFAST_DINNER',
    label: 'Room With Breakfast And Dinner',
    description: 'Includes breakfast and dinner for the room occupants.',
    featuresText: 'Breakfast & dinner, Cancellation policy, Payment: bank card, Hot Water Swimming Pool',
    extraPrice: '',
    isDefault: false,
  },
];

export function RoomTypeFormPage() {
  const { id } = useParams();
  const roomTypeId = id ? Number(id) : null;
  const isEdit = Boolean(roomTypeId);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'room-types', 'read');
  const canCreate = hasPermission(session?.perms, 'room-types', 'create');
  const canUpdate = hasPermission(session?.perms, 'room-types', 'update');
  const canSave = isEdit ? canUpdate : canCreate;
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<RoomImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantDraft[]>(DEFAULT_VARIANTS);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenities, setCustomAmenities] = useState('');
  const [form, setForm] = useState({
    hotelId: '',
    name: '',
    description: '',
    maxAdults: '2',
    maxChildren: '0',
    basePrice: '',
  });

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const hotelList = await api.listHotels();
        setHotels(hotelList ?? []);
        if (roomTypeId) {
          const roomType = await api.getRoomType(roomTypeId);
          setForm({
            hotelId: String(roomType.hotelId),
            name: roomType.name,
            description: roomType.description ?? '',
            maxAdults: String(roomType.maxAdults ?? 2),
            maxChildren: String(roomType.maxChildren ?? 0),
            basePrice: String(roomType.basePrice ?? ''),
          });
          const savedAmenities = parseAmenities(roomType.amenities);
          const knownCodes: string[] = [];
          const customValues: string[] = [];
          for (const value of savedAmenities) {
            const code = normalizeAmenity(value);
            if (code) {
              if (!knownCodes.includes(code)) knownCodes.push(code);
            } else {
              customValues.push(value);
            }
          }
          setSelectedAmenities(knownCodes);
          setCustomAmenities(customValues.join(', '));
          if (roomType.images) {
            setExistingImages(roomType.images);
          }
          if (roomType.ratePlans && roomType.ratePlans.length > 0) {
            setVariants(
              roomType.ratePlans.map((plan) => ({
                id: plan.id,
                code: plan.code,
                label: plan.label,
                description: plan.description ?? '',
                featuresText: (plan.features ?? []).join(', '),
                extraPrice: plan.extraPrice != null ? String(plan.extraPrice) : '',
                isDefault: Boolean(plan.isDefault),
              }))
            );
          }
        } else {
          setForm((current) => ({ ...current, hotelId: String(hotelList[0]?.id ?? '') }));
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load room type form.', 'error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [canRead, roomTypeId, showToast]);

  function toggleAmenity(value: string) {
    setSelectedAmenities((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { code: '', label: '', description: '', featuresText: '', extraPrice: '', isDefault: false },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveFile(index: number) {
    if (existingImages.length + files.length <= 1) {
      showToast('At least one image is required for this room type.', 'error');
      return;
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveExisting(id: number) {
    if (existingImages.length + files.length <= 1) {
      showToast('At least one image is required for this room type.', 'error');
      return;
    }
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setDeletedImageIds((prev) => [...prev, id]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    if (existingImages.length + files.length < 1) {
      showToast('At least one image is required.', 'error');
      return;
    }
    const cleanedVariants = variants.filter((variant) => variant.code.trim() && variant.label.trim());
    if (cleanedVariants.length === 0) {
      showToast('Add at least one room variant.', 'error');
      return;
    }
    setSaving(true);
    const customList = customAmenities.split(',').map((value) => value.trim()).filter(Boolean);
    const amenities = Array.from(new Set([...selectedAmenities, ...customList]));
    const ratePlans: RoomTypeRatePlan[] = cleanedVariants.map((variant, index) => ({
      id: variant.id,
      code: variant.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      label: variant.label.trim(),
      description: variant.description.trim() || undefined,
      features: variant.featuresText.split(',').map((value) => value.trim()).filter(Boolean),
      extraPrice: variant.extraPrice === '' ? 0 : Number(variant.extraPrice),
      sortOrder: index,
      isDefault: variant.isDefault,
    }));
    const payload: UpsertRoomTypePayload = {
      hotelId: Number(form.hotelId),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      maxAdults: Number(form.maxAdults),
      maxChildren: Number(form.maxChildren),
      basePrice: Number(form.basePrice),
      amenities: JSON.stringify(amenities),
      ...(isEdit ? {} : { status: Status.ACTIVE }),
      deletedImageIds: deletedImageIds.length > 0 ? deletedImageIds : undefined,
      ratePlans,
    };
    try {
      if (isEdit && roomTypeId) {
        await api.updateRoomType(roomTypeId, payload, files.length > 0 ? files : undefined);
      } else {
        await api.createRoomType(payload, files.length > 0 ? files : undefined);
      }
      showToast(isEdit ? 'Room type updated.' : 'Room type added.', 'success');
      navigate('/room-types');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to save room type.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FullPageLoader label={isEdit ? 'Loading room type...' : 'Preparing room type form...'} />;

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Room Types read permission is required to use this form.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/room-types')}>
        <ArrowLeft className="h-4 w-4" />
        Back to room types
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Update room type' : 'Add room type'}</CardTitle>
          <CardDescription>Room types belong to one hotel and drive room occupancy and pricing defaults.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <SelectField
              label="Hotel"
              required
              value={form.hotelId}
              placeholder="Select hotel"
              options={hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))}
              onChange={(event) => setForm((value) => ({ ...value, hotelId: event.target.value }))}
            />
            <TextField
              label="Name"
              required
              value={form.name}
              onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
            />
            <TextField
              label="Maximum adults"
              required
              min={1}
              type="number"
              value={form.maxAdults}
              onChange={(event) => setForm((value) => ({ ...value, maxAdults: event.target.value }))}
            />
            <TextField
              label="Maximum children"
              required
              min={0}
              type="number"
              value={form.maxChildren}
              onChange={(event) => setForm((value) => ({ ...value, maxChildren: event.target.value }))}
            />
            <TextField
              label="Base price"
              required
              min={0}
              step="0.01"
              type="number"
              value={form.basePrice}
              onChange={(event) => setForm((value) => ({ ...value, basePrice: event.target.value }))}
            />
            <TextField
              label="Description"
              wrapperClassName="md:col-span-2"
              value={form.description}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
            />
            <div className="space-y-3 md:col-span-2">
              <div>
                <span className="text-sm font-medium">Amenities</span>
                <p className="text-xs text-muted-foreground">
                  Tick the facilities available in this room. Selected amenities are shown to guests on the website.
                </p>
              </div>
              <div className="space-y-4">
                {AMENITY_GROUPS.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.category}
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const checked = selectedAmenities.includes(item.code);
                        return (
                          <label
                            key={item.code}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                              checked
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border hover:border-ring/40 hover:bg-muted/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 shrink-0 accent-primary"
                              checked={checked}
                              onChange={() => toggleAmenity(item.code)}
                            />
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <TextField
                label="Other amenities"
                placeholder="e.g. Sea view, Jacuzzi"
                hint="Add any extra amenities not listed above, separated by commas."
                value={customAmenities}
                onChange={(event) => setCustomAmenities(event.target.value)}
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Room variants</span>
                  <p className="text-xs text-muted-foreground">
                    Different meal / rate options for this room. The final nightly price shown to guests is the room's
                    base price plus the variant's extra price.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addVariant}>
                  <Plus className="h-4 w-4" />
                  Add variant
                </Button>
              </div>
              <div className="space-y-4">
                {variants.map((variant, index) => (
                  <div key={index} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Variant {index + 1}</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-40"
                        onClick={() => removeVariant(index)}
                        disabled={variants.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-xs font-medium">Variant</span>
                        <select
                          className={inputClass}
                          value={variant.code}
                          onChange={(event) => {
                            const code = event.target.value;
                            const preset = RATE_PLAN_OPTIONS.find((option) => option.code === code);
                            updateVariant(index, { code, label: preset ? preset.label : code });
                          }}
                        >
                          <option value="">Select variant</option>
                          {RATE_PLAN_OPTIONS.map((option) => (
                            <option key={option.code} value={option.code}>
                              {option.label}
                            </option>
                          ))}
                          {variant.code && !RATE_PLAN_OPTIONS.some((option) => option.code === variant.code) ? (
                            <option value={variant.code}>{variant.label || variant.code}</option>
                          ) : null}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium">Extra price (per night, over base)</span>
                        <input
                          className={inputClass}
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          value={variant.extraPrice}
                          onChange={(event) => updateVariant(index, { extraPrice: event.target.value })}
                        />
                      </label>
                      <label className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          checked={variant.isDefault}
                          onChange={(event) => updateVariant(index, { isDefault: event.target.checked })}
                        />
                        <span className="text-xs font-medium">Default variant</span>
                      </label>
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium">Short description</span>
                        <input
                          className={inputClass}
                          placeholder="Includes breakfast for the room occupants."
                          value={variant.description}
                          onChange={(event) => updateVariant(index, { description: event.target.value })}
                        />
                      </label>
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium">Features / services</span>
                        <input
                          className={inputClass}
                          placeholder="Breakfast, Cancellation policy, Payment: bank card"
                          value={variant.featuresText}
                          onChange={(event) => updateVariant(index, { featuresText: event.target.value })}
                        />
                        <span className="text-[11px] text-muted-foreground">Separate each feature with a comma.</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Images</span>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 py-6 transition-colors hover:bg-muted">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                  <span className="mt-2 block text-sm font-medium text-foreground">Click to upload images</span>
                  <span className="block text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      const uniqueNewFiles = newFiles.filter(
                        (newFile) => !files.some((prevFile) => prevFile.name === newFile.name && prevFile.size === newFile.size)
                      );
                      
                      if (uniqueNewFiles.length < newFiles.length) {
                        showToast('Duplicate images were ignored.', 'error');
                      }
                      
                      const totalFiles = [...files, ...uniqueNewFiles];
                      if (totalFiles.length > 5) {
                        showToast('You can only upload a maximum of 5 images.', 'error');
                        setFiles(totalFiles.slice(0, 5));
                      } else {
                        setFiles(totalFiles);
                      }
                    }
                    // Reset the input value so the same file can be selected again if removed
                    e.target.value = '';
                  }}
                />
              </label>
              {(existingImages.length > 0 || files.length > 0) ? (
                <div className="flex flex-wrap gap-4 pt-2">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border group">
                      <img
                        src={img.publicUrl}
                        alt="Existing"
                        className="h-full w-full cursor-pointer object-cover hover:opacity-80"
                        onClick={() => setPreviewImage(img.publicUrl)}
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
                        onClick={() => handleRemoveExisting(img.id)}
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {files.map((file, index) => (
                    <div key={index} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index}`}
                        className="h-full w-full cursor-pointer object-cover hover:opacity-80"
                        onClick={() => setPreviewImage(URL.createObjectURL(file))}
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
                        onClick={() => handleRemoveFile(index)}
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" variant="gold" disabled={!canSave || saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save room type'}
              </Button>
              <Link to="/room-types" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">Cancel</Link>
            </div>
          </form>
        </CardContent>
      </Card>
      {previewImage && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img src={previewImage} alt="Preview" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
        </div>,
        document.body
      )}
    </div>
  );
}