export const genderOptions = [
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
  { value: 3, label: 'Other' },
  { value: 4, label: 'Prefer not to say' },
];

export const recordStatusOptions = [
  { value: 1, label: 'Active' },
  { value: 2, label: 'Inactive' },
];

export const roomStatusOptions = [
  { value: 1, label: 'Available' },
  { value: 2, label: 'Occupied' },
  { value: 3, label: 'Maintenance' },
  { value: 4, label: 'Blocked' },
];

export function optionLabel(options: Array<{ value: number; label: string }>, value?: number) {
  return options.find((option) => option.value === value)?.label ?? '-';
}
