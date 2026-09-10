"use client";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SectionLabel,
  Textarea,
} from "@/components/ui";

export interface CustomerEditFormCustomer {
  id: string;
  name: string;
  commercialName?: string | null;
  legalName?: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
}

export interface CustomerEditFormProps {
  action: (formData: FormData) => void | Promise<void>;
  customer: CustomerEditFormCustomer;
}

const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

export function CustomerEditForm({ action, customer }: CustomerEditFormProps) {
  return (
    <form action={action} className="grid gap-4" data-testid="customer-edit-form">
      <input type="hidden" name="customerId" defaultValue={customer.id} />
      <fieldset className="grid gap-4">
        <SectionLabel as="legend">Información del cliente</SectionLabel>
        <div className="grid gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" defaultValue={customer.name} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="commercialName">Nombre comercial (opcional)</Label>
          <Input
            id="commercialName"
            name="commercialName"
            defaultValue={customer.commercialName ?? ""}
            placeholder="Ej. The Bimb's / Grúas Mejía"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="legalName">Razón social formal (opcional)</Label>
          <Input
            id="legalName"
            name="legalName"
            defaultValue={customer.legalName ?? ""}
            placeholder="Ej. Grúas Mejía Cuautla S.A. de C.V."
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Estado</Label>
          <Select name="status" defaultValue={customer.status}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Selecciona un estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">{statusLabels.ACTIVE}</SelectItem>
              <SelectItem value="INACTIVE">{statusLabels.INACTIVE}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </fieldset>
      <fieldset className="grid gap-4">
        <SectionLabel as="legend">Contacto y notas</SectionLabel>
        <div className="grid gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            defaultValue={customer.phone ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Dirección</Label>
          <Textarea id="address" name="address" defaultValue={customer.address ?? ""} rows={3} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" name="notes" defaultValue={customer.notes ?? ""} rows={3} />
        </div>
      </fieldset>
      <Button type="submit" variant="primary" className="w-full sm:w-fit">
        Guardar cliente
      </Button>
    </form>
  );
}
