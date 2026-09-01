import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { deleteCustomerFromForm, updateCustomerBasicsFromForm } from "@/features/customers/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getCustomerById } from "@/features/customers/queries";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CustomerEditForm } from "@/features/customers/components/customer-edit-form";
import { CustomerDeleteForm } from "@/features/customers/components/customer-delete-form";

export const metadata: Metadata = {
  title: "Editar cliente",
};

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditCustomerPage({ params, searchParams }: EditCustomerPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const updateCustomer = updateCustomerBasicsFromForm.bind(null, customer.id);

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/admin/customers">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Regresar a clientes
        </Link>
      </Button>

      <AdminPageHeader icon={Users} title={customer.name} description="Actualiza los datos básicos del cliente." variant="expanded" />
      <Card>
        <CardHeader>
          {query.error === "invalid" ? (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Revisa los datos del cliente e intenta de nuevo.
            </p>
          ) : null}
          {query.error === "cannot-delete" ? (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              No se puede eliminar el cliente porque tiene cotizaciones o actividad financiera asociada.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <CustomerEditForm action={updateCustomer} customer={customer} />
        </CardContent>
      </Card>

      <Card className="border-[var(--color-status-danger-border)]">
        <CardHeader>
          <CardTitle as="h2" className="text-lg text-[var(--color-status-danger-fg)]">
            Zona de peligro
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">
            Elimina este cliente de forma permanente. Solo es posible si no tiene cotizaciones ni historial de pagos asociados.
          </p>
        </CardHeader>
        <CardContent>
          <CustomerDeleteForm
            action={deleteCustomerFromForm}
            customerId={customer.id}
            customerName={customer.name}
          />
        </CardContent>
      </Card>
    </section>
  );
}
