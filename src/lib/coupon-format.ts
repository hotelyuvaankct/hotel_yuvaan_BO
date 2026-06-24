import type { Coupon } from '@/lib/api-types';

export function formatCouponCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCouponDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatCouponDiscount(coupon: Coupon) {
  if (coupon.discountType === 1) {
    return `${coupon.discountValue}%`;
  }
  return formatCouponCurrency(coupon.discountValue);
}

export function formatCouponDiscountDetail(coupon: Coupon) {
  if (coupon.discountType === 1) {
    const cap = coupon.maxDiscountAmount
      ? ` · max ${formatCouponCurrency(coupon.maxDiscountAmount)}`
      : '';
    return `Percentage${cap}`;
  }
  return 'Fixed amount';
}

export function couponUsagePercent(coupon: Coupon) {
  if (!coupon.totalUsageLimit || coupon.totalUsageLimit <= 0) return null;
  const used = coupon.usageCount ?? 0;
  return Math.min(100, Math.round((used / coupon.totalUsageLimit) * 100));
}

export type CouponExpiryStatus = 'expired' | 'expiring-soon' | 'active';

export function couponExpiryStatus(coupon: Coupon): CouponExpiryStatus | null {
  if (!coupon.expiryDate) return null;
  const expiry = new Date(coupon.expiryDate);
  const now = new Date();
  if (expiry < now) return 'expired';
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 7) return 'expiring-soon';
  return 'active';
}
