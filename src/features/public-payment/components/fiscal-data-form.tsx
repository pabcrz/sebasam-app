"use client";

import * as React from "react";
import { clsx } from "clsx";
import { PersonType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui";

export interface FiscalDataFormProps {
  action: (formData: FormData) => void | Promise<void>;
  isPending?: boolean;
  serverError?: string | null;
}

const personTypeTabs = [
  { value: PersonType.INDIVIDUAL, label: "Persona física" },
  { value: PersonType.BUSINESS, label: "Empresa" },
] as const;

export function FiscalDataForm({ action, isPending = false, serverError }: FiscalDataFormProps) {
  const [personType, setPersonType] = React.useState<PersonType>(PersonType.INDIVIDUAL);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Captura de datos fiscales</CardTitle>
        <CardDescription>
          Este formulario guarda tus datos fiscales para emitir la factura correspondiente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="personType" value={personType} />

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de persona">
            {personTypeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={personType === tab.value}
                onClick={() => setPersonType(tab.value)}
                className={clsx(
                  "rounded-lg border px-4 py-2 text-sm font-semibold transition-colors",
                  personType === tab.value
                    ? "border-[var(--color-primary)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]"
                    : "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">
              {personType === PersonType.INDIVIDUAL ? "Nombre completo" : "Razón social"}
            </Label>
            <Input
              id="businessName"
              name="businessName"
              required
              maxLength={200}
              placeholder={
                personType === PersonType.INDIVIDUAL
                  ? "Nombre como aparece en constancia"
                  : "Ej. Transportes Rivera S.A. de C.V."
              }
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">RFC</Label>
            <Input
              id="taxId"
              name="taxId"
              required
              maxLength={20}
              placeholder="RFC con homoclave"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxRegime">Régimen fiscal</Label>
            <Input
              id="taxRegime"
              name="taxRegime"
              maxLength={50}
              placeholder={
                personType === PersonType.INDIVIDUAL
                  ? "612 · Personas físicas con actividad empresarial"
                  : "601 · General de Ley Personas Morales"
              }
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cfdiUse">Uso de CFDI</Label>
            <Input id="cfdiUse" name="cfdiUse" maxLength={50} placeholder="G03 · Gastos en general" disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode">Código postal fiscal</Label>
            <Input id="zipCode" name="zipCode" maxLength={10} placeholder="C.P. del domicilio fiscal" disabled={isPending} />
          </div>

          {serverError ? (
            <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">
              {serverError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={isPending} disabled={isPending}>
            Guardar datos fiscales
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
