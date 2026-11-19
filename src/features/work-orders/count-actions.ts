"use server";

import { countFilteredActiveWorkOrders } from "./queries";

/** Live count for the filter sheet; an invalid draft (for example an inverted date range) has no count. */
export async function countWorkOrdersForFilters(input: Record<string, unknown>): Promise<number | null> {
  try {
    return await countFilteredActiveWorkOrders(input);
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}
