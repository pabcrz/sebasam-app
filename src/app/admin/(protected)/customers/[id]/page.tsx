import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { notFound } from "next/navigation";
import {
  Badge,
  Button,
  DialogDangerZone,
  PageHeader,
  StatTile,
  Tabs,
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { getCustomerDeletionBlocker } from "@/features/customers/domain";
import { CustomerContactsManager } from "@/features/customers/components/customer-contacts-manager";
import { CustomerDeleteForm } from "@/features/customers/components/customer-delete-form";
import { CustomerEditButton } from "@/features/customers/components/customer-edit-button";
import { CustomerUnitsPanel } from "@/features/customers/components/customer-units-panel";
import { deleteCustomerFromForm } from "@/features/customers/actions";
import { getCustomerProfile } from "@/features/customers/queries";

export const metadata: Metadata = {
  title: "Detalle de cliente",
};

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const profileTabs = ["resumen", "vehiculos", "contactos"] as const;

function ContactDatum({ icon, value, emptyLabel }: { icon: "phone" | "mail" | "home"; value: string | null; emptyLabel: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <Icon name={icon} className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
      {value ? (
        <span className="min-w-0 truncate text-[var(--color-text-main)]">{value}</span>
      ) : (
        <span className="min-w-0 truncate text-[var(--color-text-muted)]">{emptyLabel}</span>
      )}
    </div>
  );
}

export default async function CustomerDetailPage({ params, searchParams }: CustomerDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const profile = await getCustomerProfile(id);

  if (!profile) {
    notFound();
  }

  const { customer, balance } = profile;
  const displayName = customer.commercialName || customer.name;
  const isInactive = customer.status === "INACTIVE";
  const blocker = getCustomerDeletionBlocker(customer);
  const initialTab = profileTabs.find((value) => value === tab) ?? "resumen";
  const hasPendingBalance = balance.pendingBalanceCents > 0;

  const summary = (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Saldo pendiente"
          value={formatCents(balance.pendingBalanceCents)}
          tone={hasPendingBalance ? "warning" : "neutral"}
          info="Lo que el cliente debe por notas completadas y aún no pagadas."
        />
        <StatTile
          label="Saldo a favor"
          value={formatCents(balance.availableCreditCents)}
          tone={balance.availableCreditCents > 0 ? "success" : "neutral"}
          info="Abonos sin aplicar que se pueden usar en sus notas."
        />
      </div>

      <section className="grid gap-3 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        {customer.legalName ? (
          <p className="text-sm text-[var(--color-text-muted)]">Razón social: {customer.legalName}</p>
        ) : null}
        <ContactDatum icon="phone" value={customer.phone} emptyLabel="Sin teléfono" />
        <ContactDatum icon="mail" value={customer.email} emptyLabel="Sin correo" />
        <ContactDatum icon="home" value={customer.address} emptyLabel="Sin dirección" />
        {customer.notes ? (
          <p className="whitespace-pre-wrap border-t border-[var(--color-border-light)] pt-3 text-sm text-[var(--color-text-main)]">
            {customer.notes}
          </p>
        ) : null}
      </section>

      <Link
        href={`/admin/customers/${customer.id}/estado-de-cuenta`}
        className="flex min-h-[var(--tap-min-height)] items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]"
      >
        <span className="grid min-w-0 gap-0.5">
          <span className="font-semibold text-[var(--color-text-main)]">Estado de cuenta</span>
          <span className="text-sm text-[var(--color-text-muted)]">
            {hasPendingBalance ? `Saldo pendiente ${formatCents(balance.pendingBalanceCents)}` : "Al corriente"}
          </span>
        </span>
        <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
      </Link>
    </div>
  );

  return (
    <section className="mx-auto grid w-full min-w-0 max-w-4xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/admin/customers">
          <Icon name="arrow-left" className="h-4 w-4" aria-hidden="true" />
          Regresar a clientes
        </Link>
      </Button>

      <PageHeader
        title={displayName}
        status={isInactive ? <Badge variant="default">Inactivo</Badge> : null}
        secondaryActions={
          <CustomerEditButton
            customer={{
              id: customer.id,
              name: customer.name,
              commercialName: customer.commercialName,
              legalName: customer.legalName,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              notes: customer.notes,
              status: customer.status,
            }}
          />
        }
      />

      <Tabs
        label="Secciones del cliente"
        defaultValue={initialTab}
        tabs={[
          { value: "resumen", label: "Resumen", panel: summary },
          { value: "vehiculos", label: "Vehículos", panel: <CustomerUnitsPanel vehicles={customer.vehicles} /> },
          {
            value: "contactos",
            label: "Contactos",
            panel: <CustomerContactsManager customerId={customer.id} contacts={customer.contacts ?? []} />,
          },
        ]}
        panelClassName="pt-4"
      />

      <DialogDangerZone className="mt-4">
        <p className="text-sm font-semibold text-[var(--color-text-main)]">Eliminar cliente</p>
        <p className="text-sm text-[var(--color-text-muted)]">
          Solo se puede eliminar un cliente sin cotizaciones ni actividad financiera.
        </p>
        {!blocker.canDelete && blocker.reason ? (
          <p className="text-xs text-[var(--color-status-danger-fg)]">{blocker.reason}</p>
        ) : null}
        <div>
          <CustomerDeleteForm
            action={deleteCustomerFromForm}
            customerId={customer.id}
            customerName={displayName}
            disabled={!blocker.canDelete}
          />
        </div>
      </DialogDangerZone>
    </section>
  );
}
