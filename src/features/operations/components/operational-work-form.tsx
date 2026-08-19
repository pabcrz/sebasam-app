import { Button, Card, CardContent, Input, Label, Textarea } from "@/components/ui";

type FormAction = (formData: FormData) => void | Promise<void>;
type Master = { id: string; displayName: string };
type Customer = { id: string; name: string };
type Work = { masterId: string; customerId: string | null; plate: string | null; brand: string | null; model: string | null; report: string | null; notes: string | null; concepts: Array<{ description: string; quantity: unknown }> };

export function OperationalWorkForm({ action, masters, customers, initial }: { action: FormAction; masters: Master[]; customers: Customer[]; initial?: Work }) {
  const concepts = initial?.concepts ?? [{ description: "", quantity: 1 }];
  return (
    <form action={action} className="grid gap-4">
      <Card><CardContent className="grid gap-4 pt-6">
        <div className="grid gap-2"><Label htmlFor="masterId">Maestro</Label><select id="masterId" name="masterId" required defaultValue={initial?.masterId ?? ""} className="h-10 rounded-md border border-[var(--color-border-light)] bg-transparent px-3"><option value="">Selecciona un maestro</option>{masters.map((master) => <option key={master.id} value={master.id}>{master.displayName}</option>)}</select></div>
        <div className="grid gap-2"><Label htmlFor="customerId">Cliente (opcional)</Label><select id="customerId" name="customerId" defaultValue={initial?.customerId ?? ""} className="h-10 rounded-md border border-[var(--color-border-light)] bg-transparent px-3"><option value="">Sin cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
        <div className="grid gap-4 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="plate">Placa</Label><Input id="plate" name="plate" defaultValue={initial?.plate ?? ""} /></div><div className="grid gap-2"><Label htmlFor="brand">Marca</Label><Input id="brand" name="brand" defaultValue={initial?.brand ?? ""} /></div><div className="grid gap-2"><Label htmlFor="model">Modelo</Label><Input id="model" name="model" defaultValue={initial?.model ?? ""} /></div></div>
        <div className="grid gap-2"><Label htmlFor="report">Reporte</Label><Textarea id="report" name="report" defaultValue={initial?.report ?? ""} rows={4} /></div>
        <div className="grid gap-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} rows={3} /></div>
        <div className="grid gap-3"><p className="text-sm font-semibold">Conceptos operativos</p>{concepts.map((concept, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_8rem]"><Input name={`concept-description-${index}`} defaultValue={concept.description} placeholder="Descripción" required /><Input name={`concept-quantity-${index}`} type="number" min="0.01" step="0.01" defaultValue={String(concept.quantity)} required aria-label={`Cantidad ${index + 1}`} /></div>)}</div>
        <Button type="submit" variant="primary">Guardar trabajo operativo</Button>
      </CardContent></Card>
    </form>
  );
}
