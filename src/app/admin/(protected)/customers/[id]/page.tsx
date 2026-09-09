import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-page-header";
import { Button, Card, CardContent } from "@/components/ui";
import { CustomerAccountStatement } from "@/features/customers/components/customer-account-statement";
import { CustomerContactsManager } from "@/features/customers/components/customer-contacts-manager";
import { getCustomerAccountStatement, getCustomerById } from "@/features/customers/queries";
import { correctPaymentAction } from "@/features/payments/actions";

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
  const displayName = customer.commercialName || customer.name;
  const subtitle = customer.commercialName ? `Razón social: ${customer.legalName || customer.name}` : customer.legalName ? `Razón social: ${customer.legalName}` : undefined;

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/admin/customers">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Regresar a clientes
        </Link>
      </Button>

      <AdminPageHeader
        icon={Users}
        title={displayName}
        description={subtitle ?? "Detalle de cliente"}
        variant="expanded"
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/customers/${customer.id}/edit`}>Editar</Link>
          </Button>
        }
      />

      <Card>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--color-text-muted)]">Nombre</dt>
              <dd className="mt-1 font-medium text-[var(--color-text-main)]">{customer.name}</dd>
            </div>
            {customer.commercialName ? (
              <div>
                <dt className="text-[var(--color-text-muted)]">Nombre comercial</dt>
                <dd className="mt-1 font-medium text-[var(--color-text-main)]">{customer.commercialName}</dd>
              </div>
            ) : null}
            {customer.legalName ? (
              <div>
                <dt className="text-[var(--color-text-muted)]">Razón social</dt>
                <dd className="mt-1 font-medium text-[var(--color-text-main)]">{customer.legalName}</dd>
              </div>
            ) : null}
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

      <CustomerContactsManager customerId={customer.id} contacts={customer.contacts ?? []} />

      <CustomerAccountStatement statement={statement} correctPaymentAction={correctPaymentAction} />
    </section>
  );
}
