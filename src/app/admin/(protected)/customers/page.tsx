import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { createCustomerFromForm } from "@/features/customers/actions";
import { listCustomers } from "@/features/customers/queries";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { CustomerCreateForm } from "@/features/customers/components/customer-create-form";
import { CustomerCardList } from "@/features/customers/components/customer-card-list";

export const metadata: Metadata = {
  title: "Clientes",
};

type CustomersPageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
    q?: string;
    updated?: string;
  }>;
};


export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const customers = await listCustomers({ query });

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-main)] md:text-3xl">
          Clientes
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Alta, búsqueda y edición de clientes.
        </p>
      </div>

      {params.created ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]">
          Cliente creado.
        </p>
      ) : null}
      {params.updated ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]">
          Cliente actualizado.
        </p>
      ) : null}
      {params.error === "invalid" ? (
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
          <form className="flex flex-col gap-3 sm:flex-row">
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre, teléfono, correo, dirección o notas"
              className="flex-1"
            />
            <Button type="submit" variant="secondary" className="w-full sm:w-fit">
              Buscar
            </Button>
            {query ? (
              <Button asChild variant="outline" className="w-full sm:w-fit">
                <Link href="/admin/customers">
                  <X className="h-4 w-4" aria-hidden="true" />
                  Limpiar
                </Link>
              </Button>
            ) : null}
          </form>

          <CustomerCardList customers={customers} />
        </CardContent>
      </Card>
    </section>
  );
}
