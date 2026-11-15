import type { SectionFormValue } from "./quote-builder-shared";

export interface QuotePreviewFiguresInput {
  sections: SectionFormValue[];
  subtotalCents: number | null;
  discountCents?: number;
  taxCents: number | null;
  totalCents: number | null;
  isApproved?: boolean;
  isPrint?: boolean;
  selectableSectionIds?: string[];
}

/**
 * Totals and per-section figures shown by every quote document preview. Pure:
 * the same numbers feed the public card, the print view and the in-app preview.
 */
export function resolveQuotePreviewFigures({
  sections,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  isApproved,
  isPrint,
  selectableSectionIds,
}: QuotePreviewFiguresInput) {
  const hasMultipleSections = sections.length > 1;
  const hasPendingPrice = sections.some((section) => section.items.some((item) => item.description.trim() && item.unitPrice.trim() === ""));
  const hasPartialApproval = Boolean(isApproved) && sections.some((s) => s.isAuthorized === true) && sections.some((s) => s.isAuthorized === false);

  // Calculate full totals across ALL sections
  const allSectionsSubtotalCents = sections.reduce((acc, section) => {
    const completeItems = section.items.filter((item) => item.description.trim() && item.unitPrice.trim() !== "" && Number(item.unitPrice) >= 0);
    return acc + completeItems.reduce((secAcc, item) => secAcc + Math.round(Number(item.quantity) * Number(item.unitPrice) * 100), 0);
  }, 0);

  // Calculate authorized-only totals when approved with partial authorization
  const authorizedSectionsSubtotalCents = sections
    .filter((s) => s.isAuthorized)
    .reduce((acc, section) => {
      const completeItems = section.items.filter((item) => item.description.trim() && item.unitPrice.trim() !== "" && Number(item.unitPrice) >= 0);
      return acc + completeItems.reduce((secAcc, item) => secAcc + Math.round(Number(item.quantity) * Number(item.unitPrice) * 100), 0);
    }, 0);

  const discountVal = discountCents ?? 0;
  const hasTaxEnabled = taxCents !== null && taxCents > 0;

  const allTaxableCents = Math.max(0, allSectionsSubtotalCents - discountVal);
  const allTaxCents = hasTaxEnabled ? Math.round(allTaxableCents * 0.16) : 0;
  const allTotalCents = allTaxableCents + allTaxCents;

  const authorizedTaxableCents = Math.max(0, authorizedSectionsSubtotalCents - discountVal);
  const authorizedTaxCents = hasTaxEnabled ? Math.round(authorizedTaxableCents * 0.16) : 0;
  const authorizedTotalCents = authorizedTaxableCents + authorizedTaxCents;

  const fullSubtotalCents = hasPartialApproval ? authorizedSectionsSubtotalCents : allSectionsSubtotalCents;
  const fullTaxCents = hasPartialApproval ? authorizedTaxCents : allTaxCents;
  const fullTotalCents = hasPartialApproval ? authorizedTotalCents : allTotalCents;

  const displaySubtotalCents = isPrint || hasPartialApproval
    ? fullSubtotalCents
    : (hasPendingPrice ? fullSubtotalCents : subtotalCents);
  const displayTaxCents = isPrint || hasPartialApproval
    ? fullTaxCents
    : (hasPendingPrice ? fullTaxCents : taxCents);
  const displayTotalCents = isPrint || hasPartialApproval
    ? fullTotalCents
    : (hasPendingPrice ? fullTotalCents : totalCents);

  const partialNotice = hasPartialApproval ? "Total correspondiente únicamente a los conceptos autorizados." : null;
  const visibleSections = sections.flatMap((section, sectionIndex) => {
    const displayItems = section.items.filter((item) => item.description.trim());
    if (displayItems.length === 0) return [];

    const completeItems = displayItems.filter((item) => item.unitPrice.trim() !== "" && Number(item.unitPrice) >= 0);
    const isSelectable = Boolean(selectableSectionIds && section.id);
    const isSelected = isSelectable
      ? (selectableSectionIds ?? []).includes(section.id ?? "")
      : hasPartialApproval
        ? section.isAuthorized === true
        : true;
    const sectionSubtotalCents = completeItems.reduce(
      (acc, item) => acc + Math.round(Number(item.quantity) * Number(item.unitPrice) * 100),
      0,
    );
    const showsBadge = hasPartialApproval && section.isAuthorized === true;

    return [{
      section,
      sectionIndex,
      displayItems,
      isSelectable,
      isSelected,
      sectionSubtotalCents,
      showsBadge,
      shouldShowSectionHeader: hasMultipleSections || showsBadge,
    }];
  });

  return {
    hasMultipleSections,
    hasPartialApproval,
    fullSubtotalCents,
    fullTaxCents,
    fullTotalCents,
    displaySubtotalCents,
    displayTaxCents,
    displayTotalCents,
    partialNotice,
    visibleSections,
  };
}

export type QuotePreviewVisibleSection = ReturnType<typeof resolveQuotePreviewFigures>["visibleSections"][number];
