"use client";

import * as React from "react";
import { resolveDocumentDates, type DocumentDateSource } from "@/features/quotes/lib/document-dates";
import { Icon } from "@/components/ui/icon";
import type { QuoteListSummary } from "@/features/quotes/queries";
import {
  Button,
  DialogContent,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
} from "@/components/ui";
import { DocumentPreview } from "@/components/document-preview";
import type { QuotePreviewCardProps } from "./quote-preview-card";
import { toDocumentPreviewProps } from "./document-preview-model";
import { QuotePaymentBalanceIndicator } from "./quote-payment-balance-indicator";
import { quoteStatusLabels } from "@/features/quotes/lib/status";
import {
  resolveQuotePreviewContact,
  resolveQuotePreviewCustomer,
} from "@/features/quotes/lib/quote-snapshot-display";

export type QuotePreviewSummary = Pick<QuoteListSummary, "id" | "number" | "vehicleSnapshot" | "title" | "description" | "administrative" | "subtotalCents" | "discountCents" | "taxCents" | "totalCents" | "paidCents" | "remainingCents" | "validUntil"> & DocumentDateSource & {
  status?: QuoteListSummary["status"];
  customer: (Pick<NonNullable<QuoteListSummary["customer"]>, "name"> & {
    commercialName?: string | null;
    legalName?: string | null;
  }) | null;
  customerSnapshot?: unknown;
  contactSnapshot?: unknown;
  customerContact?: {
    name?: string | null;
    role?: string | null;
    phone?: string | null;
  } | null;
  customerFiscalProfile?: {
    businessName?: string | null;
  } | null;
  vehicle: Pick<NonNullable<QuoteListSummary["vehicle"]>, "plate" | "brand" | "model" | "year"> | null;
  workOrder?: Pick<NonNullable<QuoteListSummary["workOrder"]>, "id" | "status"> | null;
  items: Array<{ sectionId: string | null; type: QuoteListSummary["items"][number]["type"]; description: string; quantity: unknown; unitPriceCents: unknown }>;
  sections: Array<{ name: string; items: Array<{ type: QuoteListSummary["items"][number]["type"]; description: string; quantity: unknown; unitPriceCents: unknown }> }>;
};

interface QuotePreviewDialogProps {
  quote: QuotePreviewSummary;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  noteReturnTo?: string;
  previewTitle?: string;
}

export function toQuotePreviewCardProps(quote: QuotePreviewSummary): QuotePreviewCardProps {
  const dates = resolveDocumentDates(quote);
  const snapshot = quote.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)
    ? quote.vehicleSnapshot as Record<string, unknown>
    : {};
  const snapshotValue = (key: string) => snapshot[key] == null ? "" : String(snapshot[key]);

  // Preserve root items and section items as independent renderable sections.
  const rootItems = quote.items.filter((item) => item.sectionId == null);
  const rootSection = rootItems.length > 0
    ? [{
        name: "General",
        items: rootItems.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: item.unitPriceCents == null ? "" : String(Number(item.unitPriceCents) / 100),
        })),
        rowIds: [],
      }]
    : [];
  const sectionItems = quote.sections.map((section) => ({
        name: section.name,
        items: section.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: item.unitPriceCents == null ? "" : String(Number(item.unitPriceCents) / 100),
          rowIds: [],
        })),
        rowIds: [],
      }));
  const sections = [...rootSection, ...sectionItems];

  const contact = resolveQuotePreviewContact({
    contactSnapshot: quote.contactSnapshot,
    customerContact: quote.customerContact,
  });
  const customer = resolveQuotePreviewCustomer({
    customerSnapshot: quote.customerSnapshot,
    customer: quote.customer,
    customerFiscalProfile: quote.customerFiscalProfile,
  });

  return {
    customerName: customer.customerName,
    legalName: customer.legalName,
    contactName: contact.contactName,
    contactRole: contact.contactRole,
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
    subtotalCents: quote.subtotalCents == null ? null : Number(quote.subtotalCents),
    discountCents: Number(quote.discountCents),
    taxCents: quote.taxCents == null ? null : Number(quote.taxCents),
    totalCents: quote.totalCents == null ? null : Number(quote.totalCents),
    paidCents: quote.paidCents,
    remainingCents: quote.remainingCents,
    validUntil: quote.validUntil,
    isNote: dates.isIssuedNote,
    paymentDueDate: dates.paymentDueDate,
    compactItems: true,
    borderlessDocument: true,
    minimalPreview: true,
  };
}


export function QuotePreviewDialog({ quote, open: openProp, onOpenChange, showTrigger = true, previewTitle }: QuotePreviewDialogProps) {
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
  const documentProps = toDocumentPreviewProps(preview, {
    statusLabel: quote.status ? quoteStatusLabels[quote.status] : null,
  });
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Ver vista previa de ${quote.number}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Icon name="eye" className="h-4 w-4" aria-hidden="true" />
            <span>Ver</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent variant="sheet">
        <DialogMobileHeader>
          <DialogTitle>{previewTitle ?? `Cotización ${quote.number}`}</DialogTitle>
          <DialogMobileClose />
        </DialogMobileHeader>
        <DialogMobileBody>
          <DocumentPreview
            {...documentProps}
            balance={<QuotePaymentBalanceIndicator paidCents={preview.paidCents} remainingCents={preview.remainingCents} />}
          />
        </DialogMobileBody>
      </DialogContent>
    </Sheet>
  );
}
