import { normalizeSearchTerm } from "@/components/ui/search-bar";
import { formatUnitIdentity } from "@/lib/unit-identity";

/** Todos / Con saldo / Inactivos: the only filters the customer list offers. */
export type CustomerListFilter = "all" | "withBalance" | "inactive";

export type CustomerUnit = {
  id: string;
  economicNumber: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  /** A work order for this unit is assigned or in progress. */
  inWorkshop: boolean;
};

export type CustomerListContact = {
  name: string;
  role: string;
};

export type CustomerListRow = {
  id: string;
  name: string;
  commercialName: string | null;
  status: string;
  pendingBalanceCents: number;
  vehicles: CustomerUnit[];
  contacts: CustomerListContact[];
};

/** Units shown per row in the list; the rest are summarized as "+N unidades más". */
export const LIST_UNIT_LIMIT = 2;
/** The ficha shows this many units when the fleet is larger than the threshold. */
export const UNITS_COLLAPSED_COUNT = 4;
export const UNITS_COLLAPSE_THRESHOLD = 8;

export function filterCustomerRows<T extends Pick<CustomerListRow, "status" | "pendingBalanceCents">>(
  rows: T[],
  filter: CustomerListFilter,
): T[] {
  if (filter === "withBalance") return rows.filter((row) => row.pendingBalanceCents > 0);
  if (filter === "inactive") return rows.filter((row) => row.status === "INACTIVE");
  return rows;
}

function unitModelLabel(unit: CustomerUnit): string | null {
  return [unit.brand, unit.model].filter(Boolean).join(" ") || null;
}

/** ECO + model, else plates + model, else the model alone. Null when there is nothing to name. */
export function unitIdentity(unit: CustomerUnit): string | null {
  return formatUnitIdentity({
    economicNumber: unit.economicNumber,
    plates: unit.plate,
    model: unitModelLabel(unit),
  });
}

/** Units in the workshop first; otherwise the order received (most recent first). */
export function sortUnitsForList(units: CustomerUnit[]): CustomerUnit[] {
  return [...units].sort((first, second) => Number(second.inWorkshop) - Number(first.inWorkshop));
}

export function summarizeUnits(units: CustomerUnit[], limit = LIST_UNIT_LIMIT) {
  const sorted = sortUnitsForList(units);
  return {
    shown: sorted.slice(0, limit),
    hiddenCount: Math.max(0, sorted.length - limit),
  };
}

/**
 * Names what matched a search: the unit whose ECO or plates contain the query,
 * else the driver contact. Null when the match is only in the customer's own data.
 */
export function findSearchMatch(row: CustomerListRow, query: string): string | null {
  const term = normalizeSearchTerm(query);
  if (!term) return null;

  const unit = row.vehicles.find((vehicle) =>
    [vehicle.economicNumber, vehicle.plate].some((value) => value && normalizeSearchTerm(value).includes(term)),
  );
  if (unit) return unitIdentity(unit);

  const driver = row.contacts.find(
    (contact) => contact.role === "DRIVER" && normalizeSearchTerm(contact.name).includes(term),
  );
  return driver ? `Chofer ${driver.name}` : null;
}

export function filterUnits(
  units: CustomerUnit[],
  options: { query: string; inWorkshopOnly: boolean; withoutEco: boolean },
): CustomerUnit[] {
  const term = normalizeSearchTerm(options.query);

  return units.filter((unit) => {
    if (options.inWorkshopOnly && !unit.inWorkshop) return false;
    if (options.withoutEco && unit.economicNumber) return false;
    if (!term) return true;
    return [unit.economicNumber, unit.plate].some((value) => value && normalizeSearchTerm(value).includes(term));
  });
}

/** Above eight units the panel starts with four and offers "Ver todas". */
export function unitsWindow(units: CustomerUnit[], expanded: boolean) {
  const canExpand = units.length > UNITS_COLLAPSE_THRESHOLD;
  if (!canExpand || expanded) return { visible: units, canExpand };
  return { visible: units.slice(0, UNITS_COLLAPSED_COUNT), canExpand };
}
