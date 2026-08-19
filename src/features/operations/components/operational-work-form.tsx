"use client";

import * as React from "react";
import { Button, Card, CardContent, Input, Label, Textarea } from "@/components/ui";

type FormAction = (formData: FormData) => void | Promise<void>;
type Master = { id: string; displayName: string };
type Customer = { id: string; name: string };
type Work = { masterId: string; customerId: string | null; plate: string | null; brand: string | null; model: string | null; report: string | null; notes: string | null; concepts: Array<{ description: string; quantity: unknown }> };
type Concept = { description: string; quantity: string };

function initialConcepts(work?: Work): Concept[] {
  if (work?.concepts.length) {
    return work.concepts.map((concept) => ({ description: concept.description, quantity: String(concept.quantity) }));
  }

  return [{ description: "", quantity: "1" }];
}

export function OperationalWorkForm({ action, masters, customers, initial }: { action: FormAction; masters: Master[]; customers: Customer[]; initial?: Work }) {
  const [concepts, setConcepts] = React.useState<Concept[]>(() => initialConcepts(initial));

  function updateConcept(index: number, field: keyof Concept, value: string) {
    setConcepts((current) => current.map((concept, conceptIndex) => conceptIndex === index ? { ...concept, [field]: value } : concept));
  }

  function addConcept() {
    setConcepts((current) => [...current, { description: "", quantity: "1" }]);
  }

  function removeConcept(index: number) {
    setConcepts((current) => current.length === 1 ? current : current.filter((_, conceptIndex) => conceptIndex !== index));
  }

  return (
    <form action={action} className="grid gap-4" data-testid="operational-work-form">
      <Card><CardContent className="grid gap-4 pt-6">
        <div className="grid gap-2"><Label htmlFor="masterId">Maestro</Label><select id="masterId" name="masterId" required defaultValue={initial?.masterId ?? ""} className="h-10 rounded-md border border-[var(--color-border-light)] bg-transparent px-3"><option value="">Selecciona un maestro</option>{masters.map((master) => <option key={master.id} value={master.id}>{master.displayName}</option>)}</select></div>
        <div className="grid gap-2"><Label htmlFor="customerId">Cliente (opcional)</Label><select id="customerId" name="customerId" defaultValue={initial?.customerId ?? ""} className="h-10 rounded-md border border-[var(--color-border-light)] bg-transparent px-3"><option value="">Sin cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
        <div className="grid gap-4 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="plate">Placa</Label><Input id="plate" name="plate" defaultValue={initial?.plate ?? ""} /></div><div className="grid gap-2"><Label htmlFor="brand">Marca</Label><Input id="brand" name="brand" defaultValue={initial?.brand ?? ""} /></div><div className="grid gap-2"><Label htmlFor="model">Modelo</Label><Input id="model" name="model" defaultValue={initial?.model ?? ""} /></div></div>
        <div className="grid gap-2"><Label htmlFor="report">Reporte</Label><Textarea id="report" name="report" defaultValue={initial?.report ?? ""} rows={4} /></div>
        <div className="grid gap-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} rows={3} /></div>
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Conceptos operativos</p><Button type="button" variant="outline" size="sm" onClick={addConcept}>Agregar concepto</Button></div>
          {concepts.map((concept, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
              <div className="grid gap-2"><Label htmlFor={`concept-description-${index}`}>Descripción {index + 1}</Label><Input id={`concept-description-${index}`} name={`concept-description-${index}`} value={concept.description} onChange={(event) => updateConcept(index, "description", event.target.value)} placeholder="Descripción" required /></div>
              <div className="grid gap-2"><Label htmlFor={`concept-quantity-${index}`}>Cantidad {index + 1}</Label><Input id={`concept-quantity-${index}`} name={`concept-quantity-${index}`} type="number" min="0.01" step="0.01" value={concept.quantity} onChange={(event) => updateConcept(index, "quantity", event.target.value)} required /></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeConcept(index)} disabled={concepts.length === 1} aria-label={`Eliminar concepto ${index + 1}`}>Eliminar</Button>
            </div>
          ))}
        </div>
        <Button type="submit" variant="primary">Guardar trabajo operativo</Button>
      </CardContent></Card>
    </form>
  );
}
