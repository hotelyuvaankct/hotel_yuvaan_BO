import type { RoomType } from '@/lib/api-types';

/** Prefer API `sortOrder`; if none present, keep response order as-is. */
export function sortRoomTypes(items: RoomType[]) {
  if (!items.some((item) => item.sortOrder != null)) return items;
  return [...items].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.id - b.id;
  });
}
