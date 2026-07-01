import { z } from "zod";

export function optionalTrimmedString() {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z.string().trim().optional(),
  );
}

export function optionalDate() {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value !== "string" || !value.trim()) return undefined;
      const normalized = value.trim();
      const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
      const date = dateOnlyMatch
        ? new Date(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3]),
        )
        : new Date(normalized);
      return Number.isNaN(date.getTime()) ? undefined : date;
    },
    z.date().optional(),
  );
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function hasFilterValue(filters: Record<string, unknown>): boolean {
  return Object.values(filters).some((value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    return true;
  });
}
