import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { updateCustomerBasicsFromForm } from "@/features/customers/actions";
import { getCustomerById } from "@/features/customers/queries";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CustomerEditForm } from "@/features/customers/components/customer-edit-form";

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

      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Edición de cliente
          </p>
          <CardTitle as="h1" className="text-2xl md:text-3xl">
            {customer.name}
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">Actualiza los datos básicos del cliente.</p>
          {query.error === "invalid" ? (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Revisa los datos del cliente e intenta de nuevo.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <CustomerEditForm action={updateCustomer} customer={customer} />
        </CardContent>
      </Card>
    </section>
  );
}
