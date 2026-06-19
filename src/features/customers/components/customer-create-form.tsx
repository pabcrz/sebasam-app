"use client";

import { UserPlus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";

export interface CustomerCreateFormProps {
  action: (formData: FormData) => void | Promise<void>;
}

export function CustomerCreateForm({ action }: CustomerCreateFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          Crear cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4" data-testid="customer-create-form">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" placeholder="Nombre del cliente" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="cliente@ejemplo.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" placeholder="55 1234 5678" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea id="address" name="address" placeholder="Calle, número, colonia..." rows={3} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" placeholder="Información adicional..." rows={3} />
          </div>
          <Button type="submit" variant="primary" className="w-full sm:w-fit">
            Crear cliente
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
