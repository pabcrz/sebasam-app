"use client";

import * as React from "react";
import { useFontScaleContext } from "@/components/font-scale-provider";
import { useThemeContext } from "@/components/theme-provider";
import { Badge, ListRow, PageHeader, SectionLabel } from "@/components/ui";
import type { PaymentSettingsData } from "../domain";

export interface PaymentSettingsIndexProps {
  settings: PaymentSettingsData;
  activeWorkerCount: number;
  userCount: number;
  canManageUsers: boolean;
}

function useMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function IndexGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <SectionLabel>{title}</SectionLabel>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function IndexRow({
  title,
  href,
  value,
  decision,
  badge,
}: {
  title: string;
  href: string;
  value?: React.ReactNode;
  decision?: string;
  badge?: React.ReactNode;
}) {
  return (
    <ListRow
      href={href}
      openLabel={`Abrir ${title}`}
      decision={decision ? <span className="text-sm tabular-nums text-[var(--color-text-muted)]">{decision}</span> : null}
    >
      <span className="grid min-w-0 gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--color-text-main)]">{title}</span>
          {badge}
        </span>
        {value ? <span className="truncate text-sm text-[var(--color-text-muted)]">{value}</span> : null}
      </span>
    </ListRow>
  );
}

/** Índice de Configuración: each row shows its current value; each setting opens its own screen. */
export function PaymentSettingsIndex({
  settings,
  activeWorkerCount,
  userCount,
  canManageUsers,
}: PaymentSettingsIndexProps) {
  const { resolvedTheme } = useThemeContext();
  const { fontScale } = useFontScaleContext();
  const mounted = useMounted();

  const contactValue = [
    settings.contactPhone.trim() && `Tel. ${settings.contactPhone}`,
    settings.contactWhatsapp.trim() && `WhatsApp ${settings.contactWhatsapp}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const bankNames = settings.bankAccounts.map((account) => account.bankName).join(" · ");
  const appearance = `${resolvedTheme === "dark" ? "Oscuro" : "Claro"} · ${fontScale === "large" ? "Texto grande" : "Texto normal"}`;

  return (
    <div className="grid gap-6">
      <PageHeader title="Configuración" />

      <IndexGroup title="Taller">
        <IndexRow
          title="Datos del taller"
          href="/admin/configuracion-pago/datos-del-taller"
          value={
            <>
              <span>{settings.name}</span>
              {settings.address.trim() ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{settings.address}</span>
                </>
              ) : null}
            </>
          }
        />
        <IndexRow
          title="Contacto"
          href="/admin/configuracion-pago/contacto"
          value={contactValue || undefined}
          badge={settings.contactPhone.trim() ? null : <Badge variant="warning">Incompleto</Badge>}
        />
      </IndexGroup>

      <IndexGroup title="Cobro">
        <IndexRow
          title="Cuentas bancarias"
          href="/admin/configuracion-pago/cuentas-bancarias"
          value={bankNames || "Sin cuentas registradas"}
          decision={plural(settings.bankAccounts.length, "cuenta", "cuentas")}
        />
      </IndexGroup>

      <IndexGroup title="Equipo y acceso">
        <IndexRow
          title="Trabajadores"
          href="/admin/workers"
          decision={`${activeWorkerCount} ${activeWorkerCount === 1 ? "activo" : "activos"}`}
        />
        {canManageUsers ? (
          <IndexRow title="Usuarios" href="/admin/users" decision={plural(userCount, "usuario", "usuarios")} />
        ) : null}
        <IndexRow title="Mi contraseña" href="/admin/change-password" value="Cambiar contraseña" />
      </IndexGroup>

      <IndexGroup title="Apariencia">
        <IndexRow
          title="Apariencia"
          href="/admin/configuracion-pago/apariencia"
          value={mounted ? appearance : undefined}
        />
      </IndexGroup>
    </div>
  );
}
