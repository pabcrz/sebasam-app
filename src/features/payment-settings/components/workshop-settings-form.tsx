"use client";

import * as React from "react";
import { Input, Label } from "@/components/ui";
import { toPublicBusinessIdentity } from "@/features/public-branding/domain";
import { savePaymentSettingsAction } from "../actions";
import type { PaymentSettingsData } from "../domain";
import { SettingsChangeBar, useSettingsSection } from "./settings-section";

const fieldClass = "grid gap-1.5";

/**
 * Datos del taller. Saves its four fields only; the stored contact values travel as hidden
 * inputs so the shared save action writes them back unchanged.
 */
export function WorkshopSettingsForm({ settings }: { settings: PaymentSettingsData }) {
  const formId = React.useId();
  const { draft, dirty, pending, setField, cancel, submit } = useSettingsSection(
    {
      name: settings.name,
      fullName: settings.fullName,
      address: settings.address,
      mapsUrl: settings.mapsUrl,
    },
    savePaymentSettingsAction,
  );
  const identity = toPublicBusinessIdentity({ ...settings, name: draft.name, fullName: draft.fullName });

  return (
    <div className="grid gap-6">
      <section
        data-testid="workshop-preview"
        aria-label="Vista previa de cómo lo ve el cliente"
        className="grid gap-1 rounded-[var(--radius-lg)] bg-[var(--color-navy-700)] p-4 text-white"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">Así lo ve el cliente</p>
        {identity.businessName ? (
          <h2 className="text-2xl font-extrabold tracking-tight">{identity.businessName}</h2>
        ) : null}
        {identity.fullName ? <p className="text-xs text-white/80">{identity.fullName}</p> : null}
        <p className="text-sm text-white/80">{draft.address}</p>
        {identity.phone || identity.whatsapp ? (
          <p className="text-xs text-white/80">
            {[identity.phone && `Tel. ${identity.phone}`, identity.whatsapp && `WhatsApp ${identity.whatsapp}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </section>

      <form id={formId} onSubmit={submit} className="grid gap-4">
        <input type="hidden" name="contactPhone" value={settings.contactPhone} />
        <input type="hidden" name="contactWhatsapp" value={settings.contactWhatsapp} />

        <div className={fieldClass}>
          <Label htmlFor="workshop-name">Nombre corto</Label>
          <Input
            id="workshop-name"
            name="name"
            value={draft.name}
            onChange={(event) => setField("name", event.target.value)}
            required
          />
          <p className="text-xs text-[var(--color-text-muted)]">Va en el encabezado de los documentos.</p>
        </div>
        <div className={fieldClass}>
          <Label htmlFor="workshop-fullName">Nombre completo</Label>
          <Input
            id="workshop-fullName"
            name="fullName"
            value={draft.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
            required
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="workshop-address">Dirección</Label>
          <Input
            id="workshop-address"
            name="address"
            value={draft.address}
            onChange={(event) => setField("address", event.target.value)}
            required
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="workshop-mapsUrl">URL de Google Maps</Label>
          <Input
            id="workshop-mapsUrl"
            name="mapsUrl"
            type="url"
            value={draft.mapsUrl}
            onChange={(event) => setField("mapsUrl", event.target.value)}
            required
          />
        </div>
      </form>

      {dirty ? <SettingsChangeBar formId={formId} pending={pending} onCancel={cancel} /> : null}
    </div>
  );
}
