"use client";

import * as React from "react";
import { Save, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { savePaymentSettingsAction, addBankAccountAction, removeBankAccountAction } from "../actions";
import type { PaymentSettingsData, BankAccountData } from "../domain";

export interface PaymentSettingsFormProps {
  settings: PaymentSettingsData;
  saveError?: string;
}

function BankAccountRow({ account }: { account: BankAccountData }) {
  const fieldClass = "grid gap-1.5";
  const [pending, startTransition] = React.useTransition();

  const handleRemove = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const toastId = toast.loading("Eliminando cuenta…");
    startTransition(async () => {
      const result = await removeBankAccountAction(account.id);
      if (result.success) {
        toast.success("Cuenta eliminada.", { id: toastId });
      } else {
        toast.error("No se pudo eliminar la cuenta.", { id: toastId });
      }
    });
  };

  return (
    <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Cuenta bancaria
        </span>
        <form onSubmit={handleRemove}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            aria-label={`Eliminar cuenta ${account.bankName}`}
            className="h-8 w-8 p-0 text-[var(--color-status-danger-fg)]"
            loading={pending}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Eliminar</span>
          </Button>
        </form>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <Label htmlFor={`accountHolder-${account.id}`}>Titular</Label>
          <Input
            id={`accountHolder-${account.id}`}
            value={account.accountHolder}
            readOnly
            className="cursor-default"
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor={`bankName-${account.id}`}>Banco</Label>
          <Input
            id={`bankName-${account.id}`}
            value={account.bankName}
            readOnly
            className="cursor-default"
          />
        </div>
        {account.accountNumber.trim() ? (
          <div className={fieldClass}>
            <Label htmlFor={`accountNumber-${account.id}`}>No. de cuenta</Label>
            <Input
              id={`accountNumber-${account.id}`}
              value={account.accountNumber}
              readOnly
              className="cursor-default"
            />
          </div>
        ) : null}
        {account.clabe.trim() ? (
          <div className={fieldClass}>
            <Label htmlFor={`clabe-${account.id}`}>CLABE</Label>
            <Input
              id={`clabe-${account.id}`}
              value={account.clabe}
              readOnly
              className="cursor-default"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PaymentSettingsForm({ settings, saveError }: PaymentSettingsFormProps) {
  const [pending, startTransition] = React.useTransition();
  const [bankPending, startBankTransition] = React.useTransition();

  React.useEffect(() => {
    if (saveError) {
      toast.error(saveError);
    }
  }, [saveError]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const toastId = toast.loading("Guardando configuración…");
    startTransition(async () => {
      const result = await savePaymentSettingsAction(formData);
      if (result.success) {
        toast.success("Configuración guardada.", { id: toastId });
      } else {
        toast.error(result.error ?? "No se pudieron guardar los cambios.", { id: toastId });
      }
    });
  };

  const handleAddBankAccount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const toastId = toast.loading("Agregando cuenta…");
    startBankTransition(async () => {
      const result = await addBankAccountAction(formData);
      if (result.success) {
        form.reset();
        toast.success("Cuenta agregada.", { id: toastId });
      } else {
        toast.error(result.error ?? "No se pudo agregar la cuenta.", { id: toastId });
      }
    });
  };

  const fieldClass = "grid gap-1.5";
  const { bankAccounts } = settings;

  return (
    <div className="grid gap-6">
      {/* Business & Contact: main save form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Negocio</CardTitle>
              <CardDescription>
                Información pública del taller que aparece en los encabezados y pies de página.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className={fieldClass}>
                <Label htmlFor="name">Nombre corto</Label>
                <Input id="name" name="name" defaultValue={settings.name} required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input id="fullName" name="fullName" defaultValue={settings.fullName} required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" name="address" defaultValue={settings.address} required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="mapsUrl">URL de Google Maps</Label>
                <Input id="mapsUrl" name="mapsUrl" type="url" defaultValue={settings.mapsUrl} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacto</CardTitle>
              <CardDescription>
                Teléfonos mostrados en la sección de contacto para clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className={fieldClass}>
                <Label htmlFor="contactPhone">Teléfono fijo</Label>
                <Input id="contactPhone" name="contactPhone" defaultValue={settings.contactPhone} required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="contactWhatsapp">WhatsApp</Label>
                <Input id="contactWhatsapp" name="contactWhatsapp" defaultValue={settings.contactWhatsapp} required />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button type="submit" variant="primary" loading={pending}>
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>Guardar configuración</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Bank accounts: separate section with its own mini-forms */}
      <Card>
        <CardHeader>
          <CardTitle>Datos bancarios</CardTitle>
          <CardDescription>
            Cuentas donde los clientes realizan las transferencias. Agrega o elimina cuentas según
            necesites.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bankAccounts.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No hay cuentas bancarias registradas. Agrega una cuenta usando el formulario de abajo.
            </p>
          ) : (
            bankAccounts.map((account) => (
              <BankAccountRow key={account.id} account={account} />
            ))
          )}

          {/* Add bank account mini-form */}
          <form
            onSubmit={handleAddBankAccount}
            data-testid="add-bank-account-form"
            className="rounded-lg border border-dashed border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Agregar cuenta bancaria
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={fieldClass}>
                <Label htmlFor="new-accountHolder">Titular</Label>
                <Input id="new-accountHolder" name="accountHolder" required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-bankName">Banco</Label>
                <Input id="new-bankName" name="bankName" required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-accountNumber">No. de cuenta</Label>
                <Input id="new-accountNumber" name="accountNumber" />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-clabe">CLABE</Label>
                <Input id="new-clabe" name="clabe" />
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Ingresa No. de cuenta, CLABE o ambos.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <Button type="submit" variant="outline" size="sm" loading={bankPending}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Agregar cuenta</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
