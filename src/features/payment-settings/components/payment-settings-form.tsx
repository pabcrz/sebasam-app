"use client";

import * as React from "react";
import { Building2, Check, Copy, ExternalLink, FileText, Hash, Key, Plus, Save, Share2, Trash2, User } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import {
  savePaymentSettingsAction,
  addBankAccountAction,
  removeBankAccountAction,
  setBankAccountPublicSharingAction,
} from "../actions";
import type { PaymentSettingsData, BankAccountData } from "../domain";

export interface PaymentSettingsFormProps {
  settings: PaymentSettingsData;
  saveError?: string;
}

function BankAccountRow({ account }: { account: BankAccountData }) {
  const fieldClass = "grid gap-1.5";
  const [pending, startTransition] = React.useTransition();
  const [sharePending, startShareTransition] = React.useTransition();
  const [shareable, setShareable] = React.useState(account.isPubliclyShareable);
  const [copied, setCopied] = React.useState(false);

  const publicUrl = account.publicToken
    ? `/datos-de-pago/cuenta/${account.publicToken}`
    : "";

  const handleSharing = () => {
    const nextValue = !shareable;
    startShareTransition(async () => {
      const result = await setBankAccountPublicSharingAction(account.id, nextValue);
      if (result.success) {
        setShareable(nextValue);
        toast.success(nextValue ? "Enlace público habilitado." : "Enlace público deshabilitado.");
      } else {
        toast.error("No se pudo actualizar la visibilidad pública.");
      }
    });
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-[var(--color-text-main)]">{account.bankName}</span>
          <span aria-hidden="true" className="text-sm text-[var(--color-text-muted)]">·</span>
          <span className="text-sm font-semibold text-[var(--color-status-info)]">
            {account.isForInvoicing ? "Facturación y transferencias" : "Solo transferencias"}
          </span>
        </div>
        <form onSubmit={handleRemove}>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            aria-label={`Eliminar cuenta ${account.bankName}`}
            className="size-10"
            loading={pending}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Eliminar</span>
          </Button>
        </form>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3">
        <label className="flex min-h-[var(--tap-min-height)] items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={shareable}
            onChange={handleSharing}
            disabled={sharePending}
            className="size-4"
          />
          <Share2 className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
          Compartir esta cuenta públicamente
        </label>
        {shareable && publicUrl ? (
          <div className="w-full space-y-3 rounded-md border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-[var(--color-text-main)]">Enlace público de esta cuenta individual</p>
              <p className="text-[var(--color-text-main)]">
                {account.bankName} · {account.isForInvoicing ? "Facturación y transferencias" : "Solo transferencias"}
              </p>
              <p className="break-all font-mono text-xs text-[var(--color-text-muted)]">{publicUrl}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span>Abrir enlace</span>
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                aria-label="Copiar enlace público"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                <span>{copied ? "Copiado" : "Copiar enlace"}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <Label htmlFor={`accountHolder-${account.id}`} className="flex items-center gap-2"><User className="h-4 w-4" aria-hidden="true" />Titular</Label>
          <Input
            id={`accountHolder-${account.id}`}
            value={account.accountHolder}
            readOnly
            className="cursor-default"
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor={`bankName-${account.id}`} className="flex items-center gap-2"><Building2 className="h-4 w-4" aria-hidden="true" />Banco</Label>
          <Input
            id={`bankName-${account.id}`}
            value={account.bankName}
            readOnly
            className="cursor-default"
          />
        </div>
        {account.accountNumber.trim() ? (
          <div className={fieldClass}>
            <Label htmlFor={`accountNumber-${account.id}`} className="flex items-center gap-2"><Hash className="h-4 w-4" aria-hidden="true" />No. de cuenta</Label>
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
            <Label htmlFor={`clabe-${account.id}`} className="flex items-center gap-2"><Key className="h-4 w-4" aria-hidden="true" />CLABE</Label>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Configuración de pago
        </h1>
        <Button
          type="submit"
          form="payment-settings-form"
          variant="primary"
          size="sm"
          loading={pending}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Guardar configuración
        </Button>
      </div>
      <div data-testid="payment-settings-form-body" data-layout-width="readable" className="grid w-full gap-6">
        {/* Business & Contact: main save form */}
        <form id="payment-settings-form" data-testid="payment-settings-form" onSubmit={handleSubmit}>
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
                <Label htmlFor="new-accountHolder" className="flex items-center gap-2"><User className="h-4 w-4" aria-hidden="true" />Titular</Label>
                <Input id="new-accountHolder" name="accountHolder" required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-bankName" className="flex items-center gap-2"><Building2 className="h-4 w-4" aria-hidden="true" />Banco</Label>
                <Input id="new-bankName" name="bankName" required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-accountNumber" className="flex items-center gap-2"><Hash className="h-4 w-4" aria-hidden="true" />No. de cuenta</Label>
                <Input id="new-accountNumber" name="accountNumber" />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-clabe" className="flex items-center gap-2"><Key className="h-4 w-4" aria-hidden="true" />CLABE</Label>
                <Input id="new-clabe" name="clabe" />
              </div>
            </div>
            <Checkbox
              id="new-isForInvoicing"
              name="isForInvoicing"
              label={<span className="flex items-center gap-2"><FileText className="h-4 w-4" aria-hidden="true" />Usar esta cuenta para facturación</span>}
              className="mt-3"
            />
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
    </div>
  );
}
