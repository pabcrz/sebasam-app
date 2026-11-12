import type { DocumentPreviewProps, DocumentPreviewSection } from "@/components/document-preview";
import { formatUnitIdentity } from "@/lib/unit-identity";
import { formatDate } from "@/features/quotes/lib/format";
import { DRIVER_CONTACT_ROLE_LABEL } from "@/features/quotes/lib/quote-snapshot-display";
import { formatQuantity } from "./quote-builder-shared";
import type { QuotePreviewCardProps } from "./quote-preview-card";
import { resolveQuotePreviewFigures } from "./quote-preview-figures";

/**
 * Maps the quote preview input to the shared `DocumentPreview` props for the
 * in-app hosts. Totals and section subtotals come from the same figures the
 * public card and print view use.
 */
export function toDocumentPreviewProps(
  card: QuotePreviewCardProps,
  options: { typeLabel?: string; statusLabel?: string | null } = {},
): DocumentPreviewProps {
  const figures = resolveQuotePreviewFigures({
    sections: card.sections,
    subtotalCents: card.subtotalCents,
    discountCents: card.discountCents,
    taxCents: card.taxCents,
    totalCents: card.totalCents,
    isApproved: card.isApproved,
  });

  const sections: DocumentPreviewSection[] = figures.visibleSections.map(({
    section,
    sectionIndex,
    displayItems,
    isSelected,
    sectionSubtotalCents,
    showsBadge,
  }) => ({
    id: section.id ?? `section-${sectionIndex}`,
    name: section.name || `Sección ${sectionIndex + 1}`,
    subtotalCents: sectionSubtotalCents,
    badge: showsBadge ? "Autorizada" : null,
    muted: !isSelected,
    rows: displayItems.map((item, itemIndex) => {
      const quantityNum = Number(item.quantity);

      return {
        id: String(itemIndex),
        quantityLabel: formatQuantity(item.quantity),
        description: item.description,
        unitPriceCents: item.unitPrice.trim() ? Math.round(Number(item.unitPrice) * 100) : null,
        lineTotalCents: item.unitPrice.trim() ? Math.round(quantityNum * Number(item.unitPrice) * 100) : null,
      };
    }),
  }));

  const vehicle = card.vehicle;
  const unitModel = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");
  const isDriver = card.contactRole === DRIVER_CONTACT_ROLE_LABEL;

  return {
    typeLabel: options.typeLabel ?? (card.isNote ? "Nota" : "Cotización"),
    statusLabel: options.statusLabel ?? null,
    administrative: card.administrative,
    customer: { name: card.customerName, phone: card.customerPhone ?? null },
    driverName: isDriver ? card.contactName ?? null : null,
    unitLine: formatUnitIdentity({
      economicNumber: vehicle.economicNumber,
      plates: vehicle.plate,
      model: unitModel,
    }),
    service: card.title || null,
    sections,
    totals: {
      subtotalCents: figures.displaySubtotalCents,
      discountCents: card.discountCents ?? 0,
      taxCents: figures.displayTaxCents,
      totalCents: figures.displayTotalCents,
      partialNotice: figures.partialNotice,
    },
    notes: card.description || null,
    issuedText: card.createdAt ? `Cotizada el ${formatDate(card.createdAt)}` : null,
    validityText: !card.isNote && card.validUntil ? `Vigente hasta ${formatDate(card.validUntil)}` : null,
    dueDateText: card.isNote && card.paymentDueDate
      ? `Fecha de vencimiento de pago: ${formatDate(card.paymentDueDate)}.`
      : null,
  };
}
