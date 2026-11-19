"use server";

import { countQuotes } from "./queries";

/** Live count for the filter sheet; an invalid draft (for example an inverted date range) has no count. */
export async function countQuotesForFilters(input: Record<string, unknown>): Promise<number | null> {
  try {
    return await countQuotes(input, { operationalQueue: "quotes", operationalFilters: true });
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}
