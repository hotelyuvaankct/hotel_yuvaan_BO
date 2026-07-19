/**
 * Predefined room variant (rate plan) codes. The CODE is stored on the
 * room_type_rate_plans row and used by the booking flow; the label is the
 * default guest-facing name. Admins pick a code from a dropdown in the
 * room type form.
 */
export type RatePlanOption = {
  code: string;
  label: string;
  description: string;
  features: string[];
};

export const RATE_PLAN_OPTIONS: RatePlanOption[] = [
  {
    code: 'ROOM_ONLY',
    label: 'Room Only',
    description: 'Just the room, no meals included.',
    features: ['Cancellation policy', 'Payment: bank card', 'Hot Water Swimming Pool'],
  },
  {
    code: 'WITH_BREAKFAST',
    label: 'Room With Complimentary Breakfast',
    description: 'Includes breakfast for the room occupants.',
    features: ['Breakfast', 'Cancellation policy', 'Payment: bank card', 'Hot Water Swimming Pool'],
  },
  {
    code: 'WITH_BREAKFAST_DINNER',
    label: 'Room With Breakfast and Lunch or Dinner',
    description: 'Includes breakfast and either lunch or dinner for the room occupants.',
    features: ['Breakfast and lunch or dinner', 'Cancellation policy', 'Payment: bank card', 'Hot Water Swimming Pool'],
  },
];

const RATE_PLAN_BY_CODE = new Map(RATE_PLAN_OPTIONS.map((option) => [option.code, option]));

export function getRatePlanLabel(code: string): string | undefined {
  return RATE_PLAN_BY_CODE.get(code)?.label;
}

export function getRatePlanOption(code: string): RatePlanOption | undefined {
  return RATE_PLAN_BY_CODE.get(code);
}
