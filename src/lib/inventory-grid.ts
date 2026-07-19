import type { InventoryDayCell, InventoryGrid, InventoryRoomTypeRow } from '@/lib/api-types';

function mergeDays(existing: InventoryDayCell[], incoming: InventoryDayCell[]) {
  const byDate = new Map<string, InventoryDayCell>();
  for (const day of existing) byDate.set(day.date, day);
  for (const day of incoming) byDate.set(day.date, day);
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeRoomType(existing: InventoryRoomTypeRow | undefined, incoming: InventoryRoomTypeRow): InventoryRoomTypeRow {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    ratePlans: incoming.ratePlans ?? existing.ratePlans,
    days: mergeDays(existing.days, incoming.days),
  };
}

/** Merge two inventory grids by room type + date (keeps already-loaded columns). */
export function mergeInventoryGrids(base: InventoryGrid | null, chunk: InventoryGrid): InventoryGrid {
  if (!base) return chunk;

  const byId = new Map<number, InventoryRoomTypeRow>();
  for (const row of base.roomTypes) byId.set(row.roomTypeId, row);
  for (const row of chunk.roomTypes) {
    byId.set(row.roomTypeId, mergeRoomType(byId.get(row.roomTypeId), row));
  }

  const fromDate = base.fromDate <= chunk.fromDate ? base.fromDate : chunk.fromDate;
  const toDate = base.toDate >= chunk.toDate ? base.toDate : chunk.toDate;

  return {
    hotelId: chunk.hotelId || base.hotelId,
    fromDate,
    toDate,
    inventoryFromDate: chunk.inventoryFromDate ?? base.inventoryFromDate,
    inventoryToDate: chunk.inventoryToDate ?? base.inventoryToDate,
    roomTypes: Array.from(byId.values()),
  };
}
