import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-page-header";
import { createCustomerFromForm, getCustomerDetail } from "@/features/customers/actions";
import { listCustomers } from "@/features/customers/queries";
import { customerSearchSchema } from "@/features/customers/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CustomerCreateForm } from "@/features/customers/components/customer-create-form";
import { CustomerCardList } from "@/features/customers/components/customer-card-list";
import { CustomerSearch } from "@/features/customers/components/customer-search";

export const metadata: Metadata = {
  title: "Clientes",
};

type CustomersPageProps = {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    error?: string;
    q?: string;
    updated?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const parsedSearch = customerSearchSchema.safeParse({ query: params.q });
  const query = parsedSearch.success ? parsedSearch.data.query : "";
  const customers = await listCustomers({ query });

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <AdminPageHeader icon={Users} title="Clientes" />

      {params.created ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]" role="status">
          Cliente creado.
        </p>
      ) : null}
      {params.updated ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]" role="status">
          Cliente actualizado.
        </p>
      ) : null}
      {params.deleted ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]" role="status">
          Cliente eliminado.
        </p>
      ) : null}
      {params.error === "cannot-delete" ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
          No se puede eliminar el cliente porque tiene cotizaciones o actividad financiera asociada.
        </p>
      ) : null}
      {params.error === "invalid" || params.error === "invalid-deletion" ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
          Revisa los datos del cliente e intenta de nuevo.
        </p>
      ) : null}

      <CustomerCreateForm action={createCustomerFromForm} />

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            Buscar clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerSearch />

          {customers.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No se encontraron clientes.
              </p>
              {query ? (
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  <Link href="/admin/customers" className="text-[var(--color-primary)] hover:underline">
                    Limpiar búsqueda
                  </Link>{" "}
                  o da de alta un nuevo cliente.
                </p>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Da de alta un nuevo cliente para comenzar.
                </p>
              )}
            </div>
          ) : (
            <CustomerCardList customers={customers} getCustomerDetail={getCustomerDetail} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
