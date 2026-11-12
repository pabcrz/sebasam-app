"use client";

import * as React from "react";
import { Badge, Button, Chip, SearchBar } from "@/components/ui";
import {
  filterUnits,
  sortUnitsForList,
  unitIdentity,
  unitsWindow,
  type CustomerUnit,
} from "../customer-list";

export type CustomerUnitsPanelProps = {
  vehicles: CustomerUnit[];
};

/** The ficha's Vehículos tab: search by ECO or plates, quick filters, workshop units first. */
export function CustomerUnitsPanel({ vehicles }: CustomerUnitsPanelProps) {
  const [query, setQuery] = React.useState("");
  const [inWorkshopOnly, setInWorkshopOnly] = React.useState(false);
  const [withoutEco, setWithoutEco] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  if (vehicles.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Sin unidades registradas</p>;
  }

  const matching = sortUnitsForList(filterUnits(vehicles, { query, inWorkshopOnly, withoutEco }));
  const { visible, canExpand } = unitsWindow(matching, expanded);

  return (
    <div className="grid min-w-0 gap-3">
      <SearchBar
        aria-label="Buscar unidades"
        placeholder="Buscar por ECO o placas"
        value={query}
        onValueChange={setQuery}
      />

      <div role="group" aria-label="Filtros rápidos de unidades" className="flex min-w-0 gap-2 overflow-x-auto">
        <Chip pressed={inWorkshopOnly} onClick={() => setInWorkshopOnly((current) => !current)}>
          En taller
        </Chip>
        <Chip pressed={withoutEco} onClick={() => setWithoutEco((current) => !current)}>
          Sin ECO
        </Chip>
      </div>

      {matching.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Ninguna unidad coincide.</p>
      ) : (
        <ul aria-label="Unidades del cliente" className="grid min-w-0 divide-y divide-[var(--color-border-light)]">
          {visible.map((unit) => (
            <li key={unit.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
              <div className="grid min-w-0 gap-0.5">
                <p className="truncate text-sm font-semibold text-[var(--color-text-main)]">
                  {unitIdentity(unit) ?? "Unidad registrada"}
                </p>
                {unit.economicNumber && unit.plate ? (
                  <p className="truncate text-xs text-[var(--color-text-muted)]">Placas {unit.plate}</p>
                ) : null}
              </div>
              {unit.inWorkshop ? <Badge variant="info">En taller</Badge> : null}
            </li>
          ))}
        </ul>
      )}

      {canExpand ? (
        <Button type="button" variant="ghost" className="w-fit" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Ver menos" : "Ver todas"}
        </Button>
      ) : null}
    </div>
  );
}
