/**
 * Predefined room variant (rate plan) codes. The CODE is stored on the
 * room_type_rate_plans row and used by the booking flow; the label is the
 * default guest-facing name. Admins pick a code from a dropdown in the
 * room type form.
 */
export type RatePlanOption = {
  code: string;
  label: string;
};

export const RATE_PLAN_OPTIONS: RatePlanOption[] = [
  { code: 'ROOM_ONLY', label: 'Room Only' },
  { code: 'WITH_BREAKFAST', label: 'Room With Complimentary Breakfast' },
  { code: 'WITH_BREAKFAST_DINNER', label: 'Room With Breakfast And Dinner' },
  { code: 'WITH_HALF_BOARD', label: 'Room With Half Board' },
  { code: 'WITH_FULL_BOARD', label: 'Room With Full Board' },
  { code: 'ALL_INCLUSIVE', label: 'All Inclusive' },
];

const RATE_PLAN_BY_CODE = new Map(RATE_PLAN_OPTIONS.map((option) => [option.code, option]));

export function getRatePlanLabel(code: string): string | undefined {
  return RATE_PLAN_BY_CODE.get(code)?.label;
}
