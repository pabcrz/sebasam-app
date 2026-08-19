import Link from "next/link";
import { Badge, BadgeVariant, Button } from "@/components/ui";

export type CustomerCardListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
};

type CustomerCardListProps = {
  customers: CustomerCardListItem[];
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

const statusBadgeVariant: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  INACTIVE: "default",
};

export function CustomerCardList({ customers }: CustomerCardListProps) {
  return (
    <div className="mt-6 grid gap-3">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className="relative flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4"
        >
          <Link
            href={`/admin/customers/${customer.id}`}
            className="absolute inset-0 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            aria-label={`Ver cuenta de ${customer.name}`}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--color-text-main)]">{customer.name}</p>
            <div className="mt-0.5 grid gap-0.5 text-sm text-[var(--color-text-muted)]">
              {customer.email ? <p className="truncate">{customer.email}</p> : null}
              {customer.phone ? <p className="truncate">{customer.phone}</p> : null}
              {!customer.email && !customer.phone ? <p>Sin contacto</p> : null}
            </div>
            <div className="mt-2">
              <Badge variant={statusBadgeVariant[customer.status] ?? "default"}>
                {statusLabels[customer.status] ?? customer.status}
              </Badge>
            </div>
          </div>
          <Button asChild variant="outline" className="relative z-10">
            <Link href={`/admin/customers/${customer.id}/edit`}>Editar</Link>
          </Button>
        </div>
      ))}
      {customers.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
          No se encontraron clientes.
        </p>
      ) : null}
    </div>
  );
}
