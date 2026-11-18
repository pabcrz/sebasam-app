"use client";

import * as React from "react";
import { Input, Label } from "@/components/ui";
import { savePaymentSettingsAction } from "../actions";
import type { PaymentSettingsData } from "../domain";
import { SettingsChangeBar, useSettingsSection } from "./settings-section";

const fieldClass = "grid gap-1.5";

/**
 * Contacto. Saves its two phone fields only; the stored workshop fields travel as hidden
 * inputs so the shared save action writes them back unchanged.
 */
export function ContactSettingsForm({ settings }: { settings: PaymentSettingsData }) {
  const formId = React.useId();
  const { draft, dirty, pending, setField, cancel, submit } = useSettingsSection(
    {
      contactPhone: settings.contactPhone,
      contactWhatsapp: settings.contactWhatsapp,
    },
    savePaymentSettingsAction,
  );

  return (
    <div className="grid gap-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        Teléfonos mostrados en la sección de contacto para clientes.
      </p>

      <form id={formId} onSubmit={submit} className="grid gap-4">
        <input type="hidden" name="name" value={settings.name} />
        <input type="hidden" name="fullName" value={settings.fullName} />
        <input type="hidden" name="address" value={settings.address} />
        <input type="hidden" name="mapsUrl" value={settings.mapsUrl} />

        <div className={fieldClass}>
          <Label htmlFor="contact-phone">Teléfono fijo</Label>
          <Input
            id="contact-phone"
            name="contactPhone"
            value={draft.contactPhone}
            onChange={(event) => setField("contactPhone", event.target.value)}
            required
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="contact-whatsapp">WhatsApp</Label>
          <Input
            id="contact-whatsapp"
            name="contactWhatsapp"
            value={draft.contactWhatsapp}
            onChange={(event) => setField("contactWhatsapp", event.target.value)}
            required
          />
        </div>
      </form>

      {dirty ? <SettingsChangeBar formId={formId} pending={pending} onCancel={cancel} /> : null}
    </div>
  );
}
