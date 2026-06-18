import type { Metadata } from "next";
import { QuoteItemType, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import {
  createQuoteFromForm,
  approveQuoteAndCreateWorkOrderFromForm,
} from "@/features/quotes/actions";
import { listQuotes } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Cotizaciones",
};

type QuotesPageProps = {
  searchParams: Promise<{
    approved?: string;
    created?: string;
    error?: string;
  }>;
};

const itemTypes = Object.values(QuoteItemType);
const itemRows = Array.from({ length: 5 }, (_, index) => index);

const itemTypeLabels: Record<QuoteItemType, string> = {
  SERVICE: "Servicio",
  MATERIAL: "Material",
  LABOR: "Mano de obra",
  EQUIPMENT: "Equipo",
  OTHER: "Otro",
};

const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  PLANNED: "Planeada",
  ASSIGNED: "Asignada",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const workOrderStatusBadgeVariant: Record<
  WorkOrderStatus,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  PLANNED: "default",
  ASSIGNED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

type VehicleSnapshotView = {
  plate?: unknown;
  brand?: unknown;
  model?: unknown;
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

function formatSnapshotVehicle(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return "Sin vehículo";
  }

  const vehicle = snapshot as VehicleSnapshotView;
  const plate = typeof vehicle.plate === "string" && vehicle.plate.trim() !== "" ? vehicle.plate : "Sin placas";
  const brand = typeof vehicle.brand === "string" ? vehicle.brand : "";
  const model = typeof vehicle.model === "string" ? vehicle.model : "";
  const description = [brand, model].filter(Boolean).join(" ");

  return description ? `${plate} — ${description}` : plate;
}

function formatVehicle(vehicle: { plate: string | null; brand: string | null; model: string }) {
  const plate = vehicle.plate?.trim() || "Sin placas";
  const description = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return description ? `${plate} — ${description}` : plate;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const [customers, quotes] = await Promise.all([listCustomers(), listQuotes()]);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-[var(--space-md)] py-10">
      <Card>
        <CardHeader>
          <CardDescription>Gestión de cotizaciones</CardDescription>
          <CardTitle as="h1">Cotizaciones en borrador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl leading-7 text-[var(--color-text-muted)]">
            Crea cotizaciones en borrador para clientes existentes con subtotales y totales calculados en el servidor.
          </p>
          {params.created ? (
            <p className="mt-4 text-sm text-[var(--color-status-success-fg)]">Cotización en borrador creada.</p>
          ) : null}
          {params.approved ? (
            <p className="mt-4 text-sm text-[var(--color-status-success-fg)]">
              Cotización aprobada y orden de trabajo creada.
            </p>
          ) : null}
          {params.error === "invalid" ? (
            <p className="mt-4 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Revisa los datos de la cotización e incluye al menos una partida completa.
            </p>
          ) : null}
          {params.error === "invalid-approval" ? (
            <p className="mt-4 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Selecciona una cotización válida antes de aprobar.
            </p>
          ) : null}
          {params.error === "duplicate-work-order" ? (
            <p className="mt-4 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Esta cotización ya tiene una orden de trabajo.
            </p>
          ) : null}
          {params.error === "approval-failed" ? (
            <p className="mt-4 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              No se pudo aprobar la cotización. Recarga y confirma que siga en borrador.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Crear cotización en borrador</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createQuoteFromForm} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customerId">Cliente</Label>
              <Select name="customerId" required>
                <SelectTrigger id="customerId">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <fieldset className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
              <legend className="px-1 text-sm font-medium">Vehículo</legend>
              <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_140px_120px]">
                <div className="grid gap-2">
                  <Label htmlFor="plate">Placas (opcional)</Label>
                  <Input id="plate" name="plate" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand">Marca (opcional)</Label>
                  <Input id="brand" name="brand" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input id="model" name="model" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Input id="color" name="color" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>
            </fieldset>
            <Checkbox name="administrative" label="Cotización administrativa" />

            <div className="grid gap-3">
              <h3 className="font-semibold">Partidas</h3>
              {itemRows.map((index) => (
                <fieldset
                  key={index}
                  className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4"
                >
                  <legend className="px-1 text-sm font-medium">Partida {index + 1}</legend>
                  <div className="grid gap-3 md:grid-cols-[160px_1fr_120px_160px]">
                    <div className="grid gap-2">
                      <Label htmlFor={`items-${index}-type`}>Tipo</Label>
                      <Select name={`items.${index}.type`} defaultValue="SERVICE">
                        <SelectTrigger id={`items-${index}-type`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {itemTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {itemTypeLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`items-${index}-description`}>Descripción</Label>
                      <Input id={`items-${index}-description`} name={`items.${index}.description`} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`items-${index}-quantity`}>Cantidad</Label>
                      <Input
                        id={`items-${index}-quantity`}
                        name={`items.${index}.quantity`}
                        type="number"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`items-${index}-unitPrice`}>Precio unitario</Label>
                      <Input
                        id={`items-${index}-unitPrice`}
                        name={`items.${index}.unitPrice`}
                        type="number"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>

            <Button type="submit" variant="primary">
              Crear cotización en borrador
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Cotizaciones recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Orden de trabajo</TableHead>
                <TableHead>Partidas</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.number}</TableCell>
                  <TableCell>{quote.customer.name}</TableCell>
                  <TableCell>
                    {quote.vehicle ? formatVehicle(quote.vehicle) : formatSnapshotVehicle(quote.vehicleSnapshot)}
                  </TableCell>
                  <TableCell>{quote.title}</TableCell>
                  <TableCell>
                    <Badge variant={quoteStatusBadgeVariant[quote.status]}>{quoteStatusLabels[quote.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    {quote.workOrder ? (
                      <Badge variant={workOrderStatusBadgeVariant[quote.workOrder.status]}>
                        {quote.workOrder.number} — {workOrderStatusLabels[quote.workOrder.status]}
                      </Badge>
                    ) : (
                      <span className="text-sm text-[var(--color-text-muted)]">Ninguna</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ul className="grid gap-1">
                      {quote.items.map((item) => (
                        <li key={item.id}>
                          {item.description} — {Number(item.quantity).toFixed(2)} ×{" "}
                          {formatCents(item.unitPriceCents)} = {formatCents(item.totalCents)}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="font-medium">{formatCents(quote.totalCents)}</TableCell>
                  <TableCell>
                    {quote.status === "DRAFT" && !quote.workOrder ? (
                      <form action={approveQuoteAndCreateWorkOrderFromForm}>
                        <input type="hidden" name="quoteId" value={quote.id} />
                        <Button type="submit" variant="outline">
                          Aprobar y crear orden de trabajo
                        </Button>
                      </form>
                    ) : (
                      <span className="text-sm text-[var(--color-text-muted)]">Sin acción</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-[var(--color-text-muted)]">
                    No se encontraron cotizaciones.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
