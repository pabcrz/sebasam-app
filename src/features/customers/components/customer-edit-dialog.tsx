"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogFooter,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
  Input,
  Label,
  SectionLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { updateCustomerAction } from "../actions";

export type CustomerEditData = {
  id: string;
  name: string;
  commercialName?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
};

export type CustomerEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerEditData | null;
  onSave?: (data: CustomerEditData) => Promise<{ success: boolean; error?: string }>;
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

export function CustomerEditDialog({
  open,
  onOpenChange,
  customer,
  onSave,
}: CustomerEditDialogProps) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogMobileContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogMobileHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogMobileClose aria-label={`Cerrar edición de ${customer.name}`} />
        </DialogMobileHeader>
        <DialogMobileBody>
          <CustomerEditDialogForm
            key={customer.id}
            customer={customer}
            onOpenChange={onOpenChange}
            onSave={onSave}
          />
        </DialogMobileBody>
      </DialogMobileContent>
    </Dialog>
  );
}

function CustomerEditDialogForm({
  customer,
  onOpenChange,
  onSave,
}: {
  customer: CustomerEditData;
  onOpenChange: (open: boolean) => void;
  onSave?: (data: CustomerEditData) => Promise<{ success: boolean; error?: string }>;
}) {
  const [name, setName] = React.useState(customer.name ?? "");
  const [legalName, setLegalName] = React.useState(customer.legalName ?? "");
  const [status, setStatus] = React.useState(customer.status ?? "ACTIVE");
  const [email, setEmail] = React.useState(customer.email ?? "");
  const [phone, setPhone] = React.useState(customer.phone ?? "");
  const [address, setAddress] = React.useState(customer.address ?? "");
  const [notes, setNotes] = React.useState(customer.notes ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload: CustomerEditData = {
      id: customer.id,
      name: name.trim(),
      legalName: legalName.trim() || undefined,
      status,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    startTransition(async () => {
      const saveFn = onSave ?? updateCustomerAction;
      const result = await saveFn(payload);

      if (result.success) {
        onOpenChange(false);
      } else {
        setError(result.error ?? "No se pudo actualizar el cliente.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-2">
      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-fg)]"
        >
          {error}
        </p>
      ) : null}

      <fieldset className="grid gap-3">
        <SectionLabel as="legend">Información del cliente</SectionLabel>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-customer-name">Nombre (cliente o empresa)</Label>
          <Input
            id="edit-customer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Juan Pérez o Grúas Mejía"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-customer-legal-name">Razón social para facturación (opcional)</Label>
          <Input
            id="edit-customer-legal-name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Ej. Grúas Mejía Cuautla S.A. de C.V."
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-customer-status">Estado</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="edit-customer-status">
              <SelectValue placeholder="Selecciona un estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">{statusLabels.ACTIVE}</SelectItem>
              <SelectItem value="INACTIVE">{statusLabels.INACTIVE}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <SectionLabel as="legend">Contacto y notas</SectionLabel>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-customer-email">Correo electrónico</Label>
          <Input
            id="edit-customer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-customer-phone">Teléfono</Label>
          <Input
            id="edit-customer-phone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-customer-address">Dirección</Label>
          <Textarea
            id="edit-customer-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-customer-notes">Notas</Label>
          <Textarea
            id="edit-customer-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </fieldset>

      <DialogFooter className="mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={isPending} disabled={isPending}>
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  );
}
