import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
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
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 pb-28 sm:pb-10 md:gap-6 md:px-6 md:py-10">
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

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Clientes
        </h1>
        <div className="hidden sm:block">
          <CustomerCreateForm action={createCustomerFromForm} triggerVariant="primary" triggerSize="sm" triggerClassName="w-full sm:w-auto" />
        </div>
      </div>

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

      {/* Mobile Floating Action Button */}
      <div
        className="fixed right-4 z-40 sm:hidden"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <CustomerCreateForm
          action={createCustomerFromForm}
          triggerVariant="primary"
          triggerSize="sm"
          triggerClassName="h-11 px-4 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-1.5 border border-white/20"
        />
      </div>
    </section>
  );
}
