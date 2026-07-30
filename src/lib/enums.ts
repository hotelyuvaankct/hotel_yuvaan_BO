import type { BadgeTone } from '@/components/ui/badge';

/** Numeric / string option used by selects and labels. */
export type EnumOption<T extends number | string = number> = {
  value: T;
  label: string;
};

// ─── Core record / payment Status (API-wide) ─────────────────────────────────

export enum Status {
  ACTIVE = 1,
  INACTIVE = 2,
  DELETED = 3,
  PENDING = 4,
  PROCESSING = 5,
  SUCCESS = 6,
  FAILED = 7,
  COMPLETED = 8,
  CANCELLED = 9,
  BLOCKED = 10,
  REFUNDED = 11,
  EXPIRED = 12,
  PARTIAL_REFUND = 13,
  INSERT = 14,
  UPDATE = 15,
}

export const recordStatusOptions: EnumOption[] = [
  { value: Status.ACTIVE, label: 'Active' },
  { value: Status.INACTIVE, label: 'Inactive' },
  { value: Status.DELETED, label: 'Deleted' },
  { value: Status.PENDING, label: 'Pending' },
];

export const userStatusOptions: EnumOption[] = [
  { value: Status.ACTIVE, label: 'Active' },
  { value: Status.INACTIVE, label: 'Inactive' },
  { value: Status.PENDING, label: 'Pending' },
];

/** Badge tone for Active / Inactive / Deleted / Pending records. */
export function recordStatusTone(status?: number): BadgeTone {
  if (status === Status.ACTIVE) return 'success';
  if (status === Status.PENDING) return 'warning';
  if (status === Status.DELETED || status === Status.INACTIVE) return 'neutral';
  return 'neutral';
}

/** Badge tone for user account status. */
export function userStatusTone(status?: number): BadgeTone {
  if (status === Status.ACTIVE) return 'success';
  if (status === Status.PENDING) return 'warning';
  return 'neutral';
}

// ─── Gender ──────────────────────────────────────────────────────────────────

export enum Gender {
  MALE = 1,
  FEMALE = 2,
  OTHER = 3,
  PREFER_NOT_TO_SAY = 4,
}

export const genderOptions: EnumOption[] = [
  { value: Gender.MALE, label: 'Male' },
  { value: Gender.FEMALE, label: 'Female' },
  { value: Gender.OTHER, label: 'Other' },
  { value: Gender.PREFER_NOT_TO_SAY, label: 'Prefer not to say' },
];

// ─── Room availability ───────────────────────────────────────────────────────

export enum RoomStatus {
  AVAILABLE = 1,
  OCCUPIED = 2,
  MAINTENANCE = 3,
  BLOCKED = 4,
}

export const roomStatusOptions: EnumOption[] = [
  { value: RoomStatus.AVAILABLE, label: 'Available' },
  { value: RoomStatus.OCCUPIED, label: 'Occupied' },
  { value: RoomStatus.MAINTENANCE, label: 'Maintenance' },
  { value: RoomStatus.BLOCKED, label: 'Blocked' },
];

export function roomAvailabilityTone(status?: number): BadgeTone {
  if (status === RoomStatus.AVAILABLE) return 'success';
  if (status === RoomStatus.OCCUPIED) return 'warning';
  if (status === RoomStatus.MAINTENANCE || status === RoomStatus.BLOCKED) return 'warning';
  return 'neutral';
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export enum BookingStatus {
  PENDING = 1,
  HOLD = 2,
  CONFIRMED = 3,
  CHECKED_IN = 4,
  CHECKED_OUT = 5,
  CANCELLED = 6,
  FAILED = 7,
  EXPIRED = 8,
}

export const bookingStatusOptions: EnumOption[] = [
  { value: BookingStatus.PENDING, label: 'Pending' },
  { value: BookingStatus.HOLD, label: 'Hold' },
  { value: BookingStatus.CONFIRMED, label: 'Confirmed' },
  { value: BookingStatus.CHECKED_IN, label: 'Checked in' },
  { value: BookingStatus.CHECKED_OUT, label: 'Checked out' },
  { value: BookingStatus.CANCELLED, label: 'Cancelled' },
  { value: BookingStatus.FAILED, label: 'Failed' },
  { value: BookingStatus.EXPIRED, label: 'Expired' },
];

/** Canonical badge tone for booking status codes. */
export function bookingStatusTone(status?: number): BadgeTone {
  switch (status) {
    case BookingStatus.PENDING:
    case BookingStatus.HOLD:
      return 'warning';
    case BookingStatus.CONFIRMED:
    case BookingStatus.CHECKED_IN:
      return 'info';
    case BookingStatus.CHECKED_OUT:
      return 'success';
    case BookingStatus.CANCELLED:
    case BookingStatus.FAILED:
    case BookingStatus.EXPIRED:
      return 'danger';
    default:
      return 'neutral';
  }
}

/**
 * Compact list label for filter chips / cards
 * (Booked groups Confirmed + Checked in).
 */
export function bookingStatusDisplayLabel(status?: number): string {
  if (status === BookingStatus.CONFIRMED || status === BookingStatus.CHECKED_IN) return 'Booked';
  if (status === BookingStatus.CHECKED_OUT) return 'Completed';
  if (status === BookingStatus.CANCELLED) return 'Cancelled';
  return optionLabel(bookingStatusOptions, status);
}

export enum BookingSource {
  WEBSITE = 1,
  BACKOFFICE = 2,
  MAKEMYTRIP = 3,
  GOIBIBO = 4,
  PHONE = 5,
  WALK_IN = 6,
}

export const bookingSourceOptions: EnumOption[] = [
  { value: BookingSource.WEBSITE, label: 'Website' },
  { value: BookingSource.BACKOFFICE, label: 'Backoffice' },
  { value: BookingSource.MAKEMYTRIP, label: 'MakeMyTrip' },
  { value: BookingSource.GOIBIBO, label: 'Goibibo' },
  { value: BookingSource.PHONE, label: 'Phone' },
  { value: BookingSource.WALK_IN, label: 'Walk-in' },
];

// ─── Coupons ─────────────────────────────────────────────────────────────────

export enum CouponType {
  WEBSITE = 1,
  BACKOFFICE_ONLY = 2,
}

export const couponTypeOptions: EnumOption[] = [
  { value: CouponType.WEBSITE, label: 'Website' },
  { value: CouponType.BACKOFFICE_ONLY, label: 'Backoffice only' },
];

export enum DiscountType {
  PERCENTAGE = 1,
  FIXED = 2,
}

export const discountTypeOptions: EnumOption[] = [
  { value: DiscountType.PERCENTAGE, label: 'Percentage' },
  { value: DiscountType.FIXED, label: 'Fixed amount' },
];

// ─── Payments / transactions (string labels from API) ─────────────────────────

export const paymentStatusOptions: EnumOption<string>[] = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CAPTURED', label: 'Captured' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CREATED', label: 'Created' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PARTIAL_REFUND', label: 'Partial refund' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

export function paymentStatusTone(status?: string): BadgeTone {
  const value = (status ?? '').toUpperCase();
  if (value === 'SUCCESS' || value === 'PAID' || value === 'CAPTURED') return 'success';
  if (value === 'PROCESSING' || value === 'PENDING' || value === 'CREATED') return 'warning';
  if (value === 'REFUNDED' || value === 'PARTIAL_REFUND') return 'info';
  if (value === 'FAILED' || value === 'CANCELLED' || value === 'EXPIRED') return 'danger';
  return 'neutral';
}

export const transactionTypeOptions: EnumOption<string>[] = [
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'ORDER', label: 'Order' },
];

export function isRefundTransaction(type?: string): boolean {
  return (type ?? '').toUpperCase() === 'REFUND';
}

// ─── Settlements (string labels from API) ─────────────────────────────────────

export const settlementStatusOptions: EnumOption<string>[] = [
  { value: 'PROCESSED', label: 'Processed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVERSED', label: 'Reversed' },
  { value: 'INITIATED', label: 'Initiated' },
  { value: 'PARTIALLY_PROCESSED', label: 'Partially processed' },
  { value: 'CREATED', label: 'Created' },
];

export function settlementStatusTone(status?: string): BadgeTone {
  const value = (status ?? '').toUpperCase();
  if (value === 'PROCESSED') return 'success';
  if (value === 'FAILED' || value === 'REVERSED') return 'danger';
  if (value === 'INITIATED' || value === 'PARTIALLY_PROCESSED' || value === 'CREATED') return 'warning';
  return 'neutral';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function optionLabel(
  options: Array<EnumOption<number | string>>,
  value?: number | string | null,
): string {
  if (value == null) return '—';
  return options.find((option) => option.value === value)?.label ?? '—';
}
