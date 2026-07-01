"use client";

import * as React from "react";
import { Eye, X } from "lucide-react";
import type { listQuotes } from "@/features/quotes/queries";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { formatCents, formatDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { formatQuantity, itemTypeLabels } from "./quote-builder-shared";
import { QuoteTotalsCard } from "./quote-totals-card";

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

interface QuotePreviewDialogProps {
  quote: QuoteListItem;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function QuotePreviewDialog({ quote, open: openProp, onOpenChange, showTrigger = true }: QuotePreviewDialogProps) {
  const [openInternal, setOpenInternal] = React.useState(false);
  const open = openProp ?? openInternal;
  const setOpen = React.useCallback(
    (value: boolean) => {
      setOpenInternal(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const vehicleDescription = quote.vehicle
    ? formatVehicle(quote.vehicle)
    : formatSnapshotVehicle(quote.vehicleSnapshot);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Ver vista previa de ${quote.number}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>Ver</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-2xl">
        <DialogHeader className="relative">
          <DialogTitle>Vista previa de {quote.number}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </DialogHeader>

        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm">
          <div className="bg-[image:var(--gradient-primary)] px-5 py-4 text-white">
            <p className="text-xs font-medium opacity-90">Vista previa de cotización</p>
            <p className="text-lg font-bold">{quote.title || "Sin título"}</p>
          </div>
          <div className="grid gap-4 p-4">
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)]">CLIENTE</p>
              <p className="text-sm font-medium text-[var(--color-text-main)]">{quote.customer.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)]">UNIDAD</p>
              <p className="text-sm text-[var(--color-text-main)]">{vehicleDescription || "Sin vehículo"}</p>
            </div>
            {quote.administrative ? <Badge variant="info">Cotización administrativa</Badge> : null}
            {quote.description ? <p className="text-sm text-[var(--color-text-muted)]">{quote.description}</p> : null}

            <div className="grid gap-2">
              <p className="text-xs font-medium text-[var(--color-text-muted)]">CONCEPTOS</p>
              {quote.items.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
              ) : (
                <ul className="grid gap-2">
                  {quote.items.map((item) => {
                    const quantityNum = Number(item.quantity);

                    return (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 border-b border-[var(--color-border-light)] pb-2 text-sm text-[var(--color-text-main)] last:border-0 last:pb-0"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          {quantityNum > 1 ? (
                            <span className="font-medium">{formatQuantity(Number(item.quantity))}×</span>
                          ) : null}
                          <Badge variant="default">{itemTypeLabels[item.type] ?? item.type}</Badge>
                          {item.description}
                        </span>
                        <span className="whitespace-nowrap text-[var(--color-text-muted)]">
                          {formatCents(Number(item.totalCents))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <QuoteTotalsCard
              subtotalCents={quote.subtotalCents}
              taxCents={quote.taxCents}
              totalCents={quote.totalCents}
            />

            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm text-[var(--color-text-muted)]">
              <p>
                Vigente hasta el {quote.validUntil ? formatDate(quote.validUntil) : "—"}. Los precios están
                sujetos a cambios imprevistos en el costo de materiales.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
