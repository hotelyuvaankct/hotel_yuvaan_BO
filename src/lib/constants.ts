/** App constants that are not status/enum catalogs. Enums live in `./enums`. */

export { Status, RoomStatus } from '@/lib/enums';

export const SYSTEM_ROLE_NAMES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
} as const;

export const GALLERY_MODULE_SLUG = 'gallery';
export const GALLERY_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const GALLERY_MAX_FILE_SIZE_LABEL = '2 MB';

export enum GalleryCategory {
  RECEPTION = 'Reception',
  RESTAURANT = 'Restaurant',
  ROOMS = 'Rooms',
  EVENTS = 'Events',
  EXTERIOR = 'Exterior',
  GENERAL = 'General',
}

export const GALLERY_CATEGORIES = Object.values(GalleryCategory);

export const GALLERY_CATEGORY_FILTER_ALL = 'All';

export const GALLERY_CATEGORY_FILTERS = [GALLERY_CATEGORY_FILTER_ALL, ...GALLERY_CATEGORIES] as const;

export type GalleryCategoryFilter = (typeof GALLERY_CATEGORY_FILTERS)[number];
