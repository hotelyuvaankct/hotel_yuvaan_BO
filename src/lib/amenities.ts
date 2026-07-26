import {
  Bath,
  Coffee,
  ConciergeBell,
  Croissant,
  DoorOpen,
  Droplets,
  Fan,
  Flame,
  Lock,
  Mountain,
  ParkingCircle,
  Phone,
  Refrigerator,
  Shirt,
  ShowerHead,
  Snowflake,
  Sparkles,
  Tv,
  Utensils,
  Volume2,
  Wifi,
  Wind,
  Wine,
  type LucideIcon,
} from 'lucide-react';

/**
 * Canonical amenity codes. These stable codes are the single source of truth
 * shared across the database, backend, backoffice, and public website.
 * Store the CODE in the DB; render the label/icon per client.
 */
export const AmenityCode = {
  PRIVATE_BATHROOM: 'PRIVATE_BATHROOM',
  SHOWER: 'SHOWER',
  BATHTUB: 'BATHTUB',
  TOWELS: 'TOWELS',
  HAIR_DRYER: 'HAIR_DRYER',
  TOILETRIES: 'TOILETRIES',
  AIR_CONDITIONING: 'AIR_CONDITIONING',
  HEATING: 'HEATING',
  FAN: 'FAN',
  SOUNDPROOFING: 'SOUNDPROOFING',
  WARDROBE: 'WARDROBE',
  BALCONY: 'BALCONY',
  WIFI_FREE: 'WIFI_FREE',
  SATELLITE_CABLE_CHANNELS: 'SATELLITE_CABLE_CHANNELS',
  TELEPHONE: 'TELEPHONE',
  COFFEE_TEA_MAKER: 'COFFEE_TEA_MAKER',
  REFRIGERATOR: 'REFRIGERATOR',
  MINIBAR: 'MINIBAR',
  BREAKFAST: 'BREAKFAST',
  KITCHENETTE: 'KITCHENETTE',
  ROOM_SERVICE: 'ROOM_SERVICE',
  SAFE: 'SAFE',
  FREE_PARKING: 'FREE_PARKING',
} as const;

export type AmenityCode = (typeof AmenityCode)[keyof typeof AmenityCode];

export type AmenityOption = {
  code: AmenityCode;
  label: string;
  icon: LucideIcon;
};

export type AmenityGroup = {
  category: string;
  items: AmenityOption[];
};

export const AMENITY_GROUPS: AmenityGroup[] = [
  {
    category: 'Bathroom',
    items: [
      { code: AmenityCode.PRIVATE_BATHROOM, label: 'Private bathroom', icon: DoorOpen },
      { code: AmenityCode.SHOWER, label: 'Shower', icon: ShowerHead },
      { code: AmenityCode.BATHTUB, label: 'Bathtub', icon: Bath },
      { code: AmenityCode.TOWELS, label: 'Towels', icon: Droplets },
      { code: AmenityCode.HAIR_DRYER, label: 'Hair dryer', icon: Wind },
      { code: AmenityCode.TOILETRIES, label: 'Toiletries', icon: Sparkles },
    ],
  },
  {
    category: 'Room comfort',
    items: [
      { code: AmenityCode.AIR_CONDITIONING, label: 'Air conditioning', icon: Snowflake },
      { code: AmenityCode.HEATING, label: 'Heating', icon: Flame },
      { code: AmenityCode.FAN, label: 'Fan', icon: Fan },
      { code: AmenityCode.SOUNDPROOFING, label: 'Soundproofing', icon: Volume2 },
      { code: AmenityCode.WARDROBE, label: 'Wardrobe', icon: Shirt },
      { code: AmenityCode.BALCONY, label: 'Balcony', icon: Mountain },
    ],
  },
  {
    category: 'Entertainment & connectivity',
    items: [
      { code: AmenityCode.WIFI_FREE, label: 'Wi-Fi [free]', icon: Wifi },
      { code: AmenityCode.SATELLITE_CABLE_CHANNELS, label: 'Satellite/cable channels', icon: Tv },
      { code: AmenityCode.TELEPHONE, label: 'Telephone', icon: Phone },
    ],
  },
  {
    category: 'Food & drink',
    items: [
      { code: AmenityCode.COFFEE_TEA_MAKER, label: 'Coffee/tea maker', icon: Coffee },
      { code: AmenityCode.REFRIGERATOR, label: 'Refrigerator', icon: Refrigerator },
      { code: AmenityCode.MINIBAR, label: 'Minibar', icon: Wine },
      { code: AmenityCode.BREAKFAST, label: 'Breakfast', icon: Croissant },
      { code: AmenityCode.KITCHENETTE, label: 'Kitchenette', icon: Utensils },
    ],
  },
  {
    category: 'Services & extras',
    items: [
      { code: AmenityCode.ROOM_SERVICE, label: 'Room service', icon: ConciergeBell },
      { code: AmenityCode.SAFE, label: 'Safe', icon: Lock },
      { code: AmenityCode.FREE_PARKING, label: 'Free parking', icon: ParkingCircle },
    ],
  },
];

export const ALL_AMENITIES: AmenityOption[] = AMENITY_GROUPS.flatMap((group) => group.items);

const BY_CODE = new Map<string, AmenityOption>(ALL_AMENITIES.map((item) => [item.code, item]));

/**
 * Legacy / free-text labels that should resolve to a canonical code. Keeps old
 * data and alternate spellings mapping onto the enum. Keys are lowercased.
 */
const ALIAS_TO_CODE: Record<string, AmenityCode> = {
  ...Object.fromEntries(ALL_AMENITIES.map((item) => [item.label.toLowerCase(), item.code])),
  'wifi': AmenityCode.WIFI_FREE,
  'wi-fi': AmenityCode.WIFI_FREE,
  'free wifi': AmenityCode.WIFI_FREE,
  'wi-fi [free]': AmenityCode.WIFI_FREE,
  'air conditioning': AmenityCode.AIR_CONDITIONING,
  'ac': AmenityCode.AIR_CONDITIONING,
  'tv': AmenityCode.SATELLITE_CABLE_CHANNELS,
  'television': AmenityCode.SATELLITE_CABLE_CHANNELS,
  'satellite': AmenityCode.SATELLITE_CABLE_CHANNELS,
  'cable channels': AmenityCode.SATELLITE_CABLE_CHANNELS,
  'hairdryer': AmenityCode.HAIR_DRYER,
  'hair dryer': AmenityCode.HAIR_DRYER,
  'bathroom': AmenityCode.PRIVATE_BATHROOM,
  'closet': AmenityCode.WARDROBE,
  'kettle': AmenityCode.COFFEE_TEA_MAKER,
  'tea/coffee maker': AmenityCode.COFFEE_TEA_MAKER,
  'coffee maker': AmenityCode.COFFEE_TEA_MAKER,
  'minibar': AmenityCode.MINIBAR,
  'mini bar': AmenityCode.MINIBAR,
  'parking': AmenityCode.FREE_PARKING,
  'free parking': AmenityCode.FREE_PARKING,
};

/** Resolve any code / label / alias to a canonical code, or null if unknown (custom). */
export function normalizeAmenity(value: string): AmenityCode | null {
  const trimmed = value.trim();
  if (BY_CODE.has(trimmed)) return trimmed as AmenityCode;
  const upper = trimmed.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (BY_CODE.has(upper)) return upper as AmenityCode;
  return ALIAS_TO_CODE[trimmed.toLowerCase()] ?? null;
}

export function isKnownAmenity(value: string): boolean {
  return normalizeAmenity(value) !== null;
}

/** Human label for a stored value (known code/alias -> label; custom -> as-is). */
export function getAmenityLabel(value: string): string {
  const code = normalizeAmenity(value);
  return code ? BY_CODE.get(code)!.label : value.trim();
}

export function getAmenityIcon(value: string): LucideIcon {
  const code = normalizeAmenity(value);
  return code ? BY_CODE.get(code)!.icon : Sparkles;
}

export function parseAmenities(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
