export const genderOptions = [
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
  { value: 3, label: 'Other' },
  { value: 4, label: 'Prefer not to say' },
];

export const recordStatusOptions = [
  { value: 1, label: 'Active' },
  { value: 2, label: 'Inactive' },
  { value: 3, label: 'Deleted' },
  { value: 4, label: 'Pending' },
];

export const userStatusOptions = [
  { value: 1, label: 'Active' },
  { value: 2, label: 'Inactive' },
  { value: 4, label: 'Pending' },
];

export const roomStatusOptions = [
  { value: 1, label: 'Available' },
  { value: 2, label: 'Occupied' },
  { value: 3, label: 'Maintenance' },
  { value: 4, label: 'Blocked' },
];

export const bookingStatusOptions = [
  { value: 1, label: 'Pending' },
  { value: 2, label: 'Hold' },
  { value: 3, label: 'Confirmed' },
  { value: 4, label: 'Checked in' },
  { value: 5, label: 'Checked out' },
  { value: 6, label: 'Cancelled' },
  { value: 7, label: 'Failed' },
  { value: 8, label: 'Expired' },
];

/** Primary list filters: Booked / Completed / Cancelled */
export const bookingListStatusFilters = [
  { value: 3, label: 'Booked' },
  { value: 5, label: 'Completed' },
  { value: 6, label: 'Cancelled' },
];

export const bookingSourceOptions = [
  { value: 1, label: 'Website' },
  { value: 2, label: 'Backoffice' },
  { value: 3, label: 'MakeMyTrip' },
  { value: 4, label: 'Goibibo' },
  { value: 5, label: 'Phone' },
  { value: 6, label: 'Walk-in' },
];

export const couponTypeOptions = [
  { value: 1, label: 'Website' },
  { value: 2, label: 'Backoffice only' },
];

export const discountTypeOptions = [
  { value: 1, label: 'Percentage' },
  { value: 2, label: 'Fixed amount' },
];

export function optionLabel(options: Array<{ value: number; label: string }>, value?: number) {
  return options.find((option) => option.value === value)?.label ?? '-';
}
