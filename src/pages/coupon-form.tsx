import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { HotelSummary, UpsertCouponPayload } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { couponTypeOptions, discountTypeOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';
import { SelectField, TextField } from '@/components/ui/form-fields';

const WEBSITE_TYPE = 1;

export function CouponFormPage() {
  const { id } = useParams();
  const couponId = id ? Number(id) : null;
  const isEdit = Boolean(couponId);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'coupons', 'read');
  const canCreate = hasPermission(session?.perms, 'coupons', 'create');
  const canUpdate = hasPermission(session?.perms, 'coupons', 'update');
  const canSave = isEdit ? canUpdate : canCreate;
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    hotelId: '',
    code: '',
    title: '',
    description: '',
    couponType: String(WEBSITE_TYPE),
    discountType: '1',
    discountValue: '',
    maxDiscountAmount: '',
    minBookingAmount: '0',
    startDate: '',
    expiryDate: '',
    totalUsageLimit: '',
    perUserUsageLimit: '1',
  });

  const isPercentage = Number(form.discountType) === 1;
  const isWebsiteType = Number(form.couponType) === WEBSITE_TYPE;

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const hotelList = await api.listHotels();
        setHotels(hotelList ?? []);
        if (couponId) {
          const coupon = await api.getCoupon(couponId);
          setForm({
            hotelId: coupon.hotelId ? String(coupon.hotelId) : '',
            code: coupon.code,
            title: coupon.title,
            description: coupon.description ?? '',
            couponType: String(coupon.couponType),
            discountType: String(coupon.discountType),
            discountValue: String(coupon.discountValue),
            maxDiscountAmount: coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : '',
            minBookingAmount: coupon.minBookingAmount != null ? String(coupon.minBookingAmount) : '0',
            startDate: coupon.startDate,
            expiryDate: coupon.expiryDate,
            totalUsageLimit: coupon.totalUsageLimit != null ? String(coupon.totalUsageLimit) : '',
            perUserUsageLimit: coupon.perUserUsageLimit != null ? String(coupon.perUserUsageLimit) : '1',
          });
        } else {
          setForm((current) => ({ ...current, hotelId: String(hotelList[0]?.id ?? '') }));
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load coupon form.', 'error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [canRead, couponId, showToast]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const payload: UpsertCouponPayload = {
      hotelId: form.hotelId ? Number(form.hotelId) : undefined,
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      couponType: Number(form.couponType),
      discountType: Number(form.discountType),
      discountValue: Number(form.discountValue),
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
      minBookingAmount: form.minBookingAmount ? Number(form.minBookingAmount) : 0,
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      totalUsageLimit: form.totalUsageLimit ? Number(form.totalUsageLimit) : undefined,
      perUserUsageLimit: form.perUserUsageLimit ? Number(form.perUserUsageLimit) : 1,
    };

    setSaving(true);
    try {
      if (isEdit && couponId) {
        await api.updateCoupon(couponId, payload);
        showToast('Coupon updated.', 'success');
        navigate(`/coupons/${couponId}`);
      } else {
        const created = await api.createCoupon(payload);
        showToast('Coupon created.', 'success');
        navigate(`/coupons/${created.id}`);
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to save coupon.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FullPageLoader label={isEdit ? 'Loading coupon...' : 'Preparing coupon form...'} />;

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Coupons read permission is required to use this form.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate(isEdit && couponId ? `/coupons/${couponId}` : '/coupons')}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit coupon' : 'Create coupon'}</CardTitle>
          <CardDescription>
            Website coupons appear on the public site. Backoffice coupons are for staff bookings only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6 md:grid-cols-2" onSubmit={onSubmit}>
            <SelectField
              label="Hotel"
              value={form.hotelId}
              placeholder="Select hotel"
              options={hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))}
              onChange={(event) => setForm((current) => ({ ...current, hotelId: event.target.value }))}
            />
            <TextField
              label="Coupon code"
              required
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              hint="Unique code guests enter at checkout"
            />
            <TextField
              label="Title"
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
            <SelectField
              label="Coupon type"
              required
              value={form.couponType}
              options={couponTypeOptions.map((option) => ({ value: option.value, label: option.label }))}
              onChange={(event) => setForm((current) => ({ ...current, couponType: event.target.value }))}
              hint={
                isWebsiteType
                  ? 'Shown on the website and usable at online checkout'
                  : 'Only visible and usable in backoffice bookings'
              }
            />
            <SelectField
              label="Discount type"
              required
              value={form.discountType}
              options={discountTypeOptions.map((option) => ({ value: option.value, label: option.label }))}
              onChange={(event) => setForm((current) => ({ ...current, discountType: event.target.value }))}
            />
            <TextField
              label={isPercentage ? 'Discount percentage' : 'Discount amount (INR)'}
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.discountValue}
              onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))}
            />
            {isPercentage ? (
              <TextField
                label="Max discount cap (INR)"
                type="number"
                min="0.01"
                step="0.01"
                value={form.maxDiscountAmount}
                onChange={(event) => setForm((current) => ({ ...current, maxDiscountAmount: event.target.value }))}
                hint="Optional cap for percentage discounts"
              />
            ) : (
              <div />
            )}
            <TextField
              label="Minimum booking amount (INR)"
              type="number"
              min="0"
              step="0.01"
              value={form.minBookingAmount}
              onChange={(event) => setForm((current) => ({ ...current, minBookingAmount: event.target.value }))}
            />
            <TextField
              label="Start date"
              required
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            />
            <TextField
              label="Expiry date"
              required
              type="date"
              value={form.expiryDate}
              onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
            />
            <TextField
              label="Total usage limit"
              type="number"
              min="1"
              value={form.totalUsageLimit}
              onChange={(event) => setForm((current) => ({ ...current, totalUsageLimit: event.target.value }))}
              hint="Leave blank for unlimited redemptions"
            />
            <TextField
              label="Per-email usage limit"
              type="number"
              min="1"
              value={form.perUserUsageLimit}
              onChange={(event) => setForm((current) => ({ ...current, perUserUsageLimit: event.target.value }))}
              hint="How many times the same guest email can use this coupon"
            />
            <div className="md:col-span-2">
              <TextField
                label="Description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <Button type="submit" variant="gold" disabled={!canSave || saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : isEdit ? 'Update coupon' : 'Create coupon'}
              </Button>
              <Link
                to={isEdit && couponId ? `/coupons/${couponId}` : '/coupons'}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold"
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
