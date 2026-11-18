"use client";

import * as React from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DialogClose,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogMobileClose,
  DialogTitle,
  Icon,
  Input,
  Label,
  Sheet,
} from "@/components/ui";
import {
  addBankAccountAction,
  removeBankAccountAction,
  setBankAccountPublicSharingAction,
} from "../actions";
import type { BankAccountData } from "../domain";

const fieldClass = "grid gap-1.5";

function accountUseLabel(account: BankAccountData) {
  return account.isForInvoicing ? "Facturación y transferencias" : "Solo transferencias";
}

function BankAccountCard({ account }: { account: BankAccountData }) {
  const [sharePending, startShareTransition] = React.useTransition();
  const [removePending, startRemoveTransition] = React.useTransition();
  const [shareable, setShareable] = React.useState(account.isPubliclyShareable);
  const [copied, setCopied] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);

  const publicUrl = account.publicToken ? `/datos-de-pago/cuenta/${account.publicToken}` : "";

  const handleSharing = (enabled: boolean) => {
    startShareTransition(async () => {
      const result = await setBankAccountPublicSharingAction(account.id, enabled);
      if (result.success) {
        setShareable(enabled);
        toast.success(enabled ? "Enlace público habilitado." : "Enlace público deshabilitado.");
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

  const handleRemove = () => {
    const toastId = toast.loading("Eliminando cuenta…");
    startRemoveTransition(async () => {
      const result = await removeBankAccountAction(account.id);
      setConfirmRemove(false);
      if (result.success) {
        toast.success("Cuenta eliminada.", { id: toastId });
      } else {
        toast.error("No se pudo eliminar la cuenta.", { id: toastId });
      }
    });
  };

  return (
    <article className="grid gap-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[var(--color-text-main)]">{account.bankName}</h2>
        <Badge variant={account.isForInvoicing ? "info" : "default"}>{accountUseLabel(account)}</Badge>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <Label htmlFor={`accountHolder-${account.id}`} className="flex items-center gap-2">
            <Icon name="user" className="h-4 w-4" aria-hidden="true" />
            Titular
          </Label>
          <Input id={`accountHolder-${account.id}`} value={account.accountHolder} readOnly className="cursor-default" />
        </div>
        {account.accountNumber.trim() ? (
          <div className={fieldClass}>
            <Label htmlFor={`accountNumber-${account.id}`} className="flex items-center gap-2">
              <Icon name="hash" className="h-4 w-4" aria-hidden="true" />
              No. de cuenta
            </Label>
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
            <Label htmlFor={`clabe-${account.id}`} className="flex items-center gap-2">
              <Icon name="key" className="h-4 w-4" aria-hidden="true" />
              CLABE
            </Label>
            <Input id={`clabe-${account.id}`} value={account.clabe} readOnly className="cursor-default" />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-[var(--tap-min-height)] items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={shareable}
              onChange={(event) => handleSharing(event.target.checked)}
              disabled={sharePending}
              className="size-4"
            />
            Compartir esta cuenta públicamente
          </label>
          <span className="text-sm text-[var(--color-text-muted)]">
            {shareable ? "Enlace público activo" : "Enlace público apagado"}
          </span>
        </div>

        {shareable && publicUrl ? (
          <div className="grid gap-2">
            <p className="break-all text-xs text-[var(--color-text-muted)]">{publicUrl}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="external-link" className="h-4 w-4" aria-hidden="true" />
                  <span>Abrir enlace</span>
                </a>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyLink} aria-label="Copiar enlace público">
                <Icon name={copied ? "check" : "copy"} className="h-4 w-4" aria-hidden="true" />
                <span>{copied ? "Copiado" : "Copiar enlace"}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="flex justify-end">
        <Button
          type="button"
          variant="danger"
          size="sm"
          aria-label={`Eliminar cuenta ${account.bankName}`}
          onClick={() => setConfirmRemove(true)}
          disabled={removePending}
        >
          <Icon name="trash" className="h-4 w-4" aria-hidden="true" />
          Eliminar
        </Button>
      </footer>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`¿Eliminar cuenta ${account.bankName}?`}
        description="La cuenta y su enlace público dejarán de estar disponibles para los clientes."
        confirmLabel="Eliminar cuenta"
        variant="danger"
        loading={removePending}
        onConfirm={handleRemove}
      />
    </article>
  );
}

/** Cuentas bancarias: one card per account; "Agregar" opens a sheet with the add form. */
export function BankAccountsSection({ bankAccounts }: { bankAccounts: BankAccountData[] }) {
  const formId = React.useId();
  const [addOpen, setAddOpen] = React.useState(false);
  const [addPending, startAddTransition] = React.useTransition();

  const handleAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const toastId = toast.loading("Agregando cuenta…");
    startAddTransition(async () => {
      const result = await addBankAccountAction(formData);
      if (result.success) {
        form.reset();
        setAddOpen(false);
        toast.success("Cuenta agregada.", { id: toastId });
      } else {
        toast.error(result.error ?? "No se pudo agregar la cuenta.", { id: toastId });
      }
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">Donde tus clientes transfieren.</p>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" className="h-4 w-4" aria-hidden="true" />
          Agregar
        </Button>
      </div>

      {bankAccounts.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card)]">
          No hay cuentas bancarias registradas. Agrega una para que los clientes puedan transferir.
        </p>
      ) : (
        bankAccounts.map((account) => <BankAccountCard key={account.id} account={account} />)
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <DialogMobileContent variant="sheet">
          <DialogMobileHeader>
            <DialogTitle>Agregar cuenta bancaria</DialogTitle>
            <DialogMobileClose />
          </DialogMobileHeader>

          <DialogMobileBody className="grid content-start gap-4">
            <form id={formId} onSubmit={handleAdd} data-testid="add-bank-account-form" className="grid gap-4">
              <div className={fieldClass}>
                <Label htmlFor="new-accountHolder" className="flex items-center gap-2">
                  <Icon name="user" className="h-4 w-4" aria-hidden="true" />
                  Titular
                </Label>
                <Input id="new-accountHolder" name="accountHolder" required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-bankName" className="flex items-center gap-2">
                  <Icon name="company" className="h-4 w-4" aria-hidden="true" />
                  Banco
                </Label>
                <Input id="new-bankName" name="bankName" required />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-accountNumber" className="flex items-center gap-2">
                  <Icon name="hash" className="h-4 w-4" aria-hidden="true" />
                  No. de cuenta
                </Label>
                <Input id="new-accountNumber" name="accountNumber" />
              </div>
              <div className={fieldClass}>
                <Label htmlFor="new-clabe" className="flex items-center gap-2">
                  <Icon name="key" className="h-4 w-4" aria-hidden="true" />
                  CLABE
                </Label>
                <Input id="new-clabe" name="clabe" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Ingresa No. de cuenta, CLABE o ambos.</p>
              <Checkbox
                id="new-isForInvoicing"
                name="isForInvoicing"
                label={
                  <span className="flex items-center gap-2">
                    <Icon name="quotes" className="h-4 w-4" aria-hidden="true" />
                    Usar esta cuenta para facturación
                  </span>
                }
              />
            </form>
          </DialogMobileBody>

          <DialogMobileFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" form={formId} loading={addPending} disabled={addPending}>
              Agregar cuenta
            </Button>
          </DialogMobileFooter>
        </DialogMobileContent>
      </Sheet>
    </div>
  );
}
