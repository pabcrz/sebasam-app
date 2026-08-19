import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CustomerAccountStatement } from "@/features/customers/components/customer-account-statement";
import { getCustomerAccountStatement, getCustomerById } from "@/features/customers/queries";

export const metadata: Metadata = {
  title: "Detalle de cliente",
};

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const statement = await getCustomerAccountStatement(customer.id);

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/admin/customers">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Regresar a clientes
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                Cliente
              </p>
              <CardTitle as="h1" className="mt-1 text-2xl md:text-3xl">
                {customer.name}
              </CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href={`/admin/customers/${customer.id}/edit`}>Editar</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--color-text-muted)]">Correo electrónico</dt>
              <dd className="mt-1 font-medium text-[var(--color-text-main)]">{customer.email ?? "Sin correo electrónico"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Teléfono</dt>
              <dd className="mt-1 font-medium text-[var(--color-text-main)]">{customer.phone ?? "Sin teléfono"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Dirección</dt>
              <dd className="mt-1 font-medium text-[var(--color-text-main)]">{customer.address ?? "Sin dirección"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Estado</dt>
              <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                {customer.status === "ACTIVE" ? "Activo" : "Inactivo"}
              </dd>
            </div>
          </dl>
          {customer.notes ? (
            <div className="mt-4 border-t border-[var(--color-border-light)] pt-4 text-sm">
              <p className="text-[var(--color-text-muted)]">Notas</p>
              <p className="mt-1 whitespace-pre-wrap text-[var(--color-text-main)]">{customer.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CustomerAccountStatement statement={statement} />
    </section>
  );
}
