"use client";

import { useRouter } from "next/navigation";
import { Filter, X } from "lucide-react";
import type { QuoteStatus } from "@prisma/client";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import type { QuoteFilterInput } from "@/features/quotes/schemas";

const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aceptada",
  REJECTED: "Declinada",
  CANCELLED: "Cancelada",
};

type QuoteFiltersCustomer = {
  id: string;
  name: string;
};

type QuoteFiltersProps = {
  filters: QuoteFilterInput;
  customers: QuoteFiltersCustomer[];
};

function formatDateValue(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function QuoteFilters({ filters, customers }: QuoteFiltersProps) {
  const router = useRouter();
  const hasFilters =
    Boolean(filters.status) ||
    Boolean(filters.customerId) ||
    Boolean(filters.number) ||
    Boolean(filters.plate) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value.trim());
      }
    }

    router.push(`/admin/quotes?${params.toString()}`);
  }

  function handleClear() {
    router.push("/admin/quotes");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
        <h3 className="text-base font-medium text-[var(--color-text-main)]">Filtros</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="status" className="text-sm">
            Estatus
          </Label>
          <Select name="status" defaultValue={filters.status ?? ""}>
            <SelectTrigger id="status" aria-label="Estatus">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.entries(quoteStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="customerId" className="text-sm">
            Cliente
          </Label>
          <Select name="customerId" defaultValue={filters.customerId ?? ""}>
            <SelectTrigger id="customerId" aria-label="Cliente">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="number" className="text-sm">
            Folio
          </Label>
          <Input
            id="number"
            name="number"
            defaultValue={filters.number ?? ""}
            placeholder="Ej. C-001"
            type="search"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="plate" className="text-sm">
            Placas
          </Label>
          <Input
            id="plate"
            name="plate"
            defaultValue={filters.plate ?? ""}
            placeholder="Ej. ABC-123"
            type="search"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="dateFrom" className="text-sm">
            Desde
          </Label>
          <Input
            id="dateFrom"
            name="dateFrom"
            defaultValue={formatDateValue(filters.dateFrom)}
            type="date"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="dateTo" className="text-sm">
            Hasta
          </Label>
          <Input
            id="dateTo"
            name="dateTo"
            defaultValue={formatDateValue(filters.dateTo)}
            type="date"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="secondary" className="w-full sm:w-fit">
          Filtrar
        </Button>
        {hasFilters ? (
          <Button type="button" variant="outline" className="w-full sm:w-fit" onClick={handleClear}>
            <X className="h-4 w-4" aria-hidden="true" />
            Limpiar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
