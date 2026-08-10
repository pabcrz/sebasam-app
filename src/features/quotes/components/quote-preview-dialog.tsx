"use client";

import * as React from "react";
import { Eye, X } from "lucide-react";
import type { QuoteListSummary } from "@/features/quotes/queries";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { QuotePreviewCard, type QuotePreviewCardProps } from "./quote-preview-card";

interface QuotePreviewDialogProps {
  quote: QuoteListSummary;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function toQuotePreviewCardProps(quote: QuoteListSummary): QuotePreviewCardProps {
  const snapshot = quote.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)
    ? quote.vehicleSnapshot as Record<string, unknown>
    : {};
  const snapshotValue = (key: string) => snapshot[key] == null ? "" : String(snapshot[key]);

  // Build sections from DB items — group by section if available, else one default section
  const sections = quote.sections && quote.sections.length > 0
    ? quote.sections.map((section) => ({
        name: section.name,
        items: section.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: String(Number(item.unitPriceCents) / 100),
          rowIds: [],
        })),
        rowIds: [],
      }))
    : [{
        name: "General",
        items: quote.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: String(Number(item.unitPriceCents) / 100),
        })),
        rowIds: [],
      }];

  return {
    customerName: quote.customer.name,
    vehicle: {
      plate: quote.vehicle?.plate ?? snapshotValue("plate"),
      brand: quote.vehicle?.brand ?? snapshotValue("brand"),
      model: quote.vehicle?.model ?? snapshotValue("model"),
      year: quote.vehicle?.year != null ? String(quote.vehicle.year) : snapshotValue("year"),
    },
    title: quote.title,
    description: quote.description ?? "",
    administrative: quote.administrative,
    sections,
    subtotalCents: Number(quote.subtotalCents),
    discountCents: Number(quote.discountCents),
    taxCents: Number(quote.taxCents),
    totalCents: Number(quote.totalCents),
    paidCents: quote.paidCents,
    remainingCents: quote.remainingCents,
    validUntil: quote.validUntil,
  };
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
  const preview = toQuotePreviewCardProps(quote);

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
          <DialogTitle>Cotización {quote.number}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </DialogHeader>

        <QuotePreviewCard {...preview} />
      </DialogContent>
    </Dialog>
  );
}
