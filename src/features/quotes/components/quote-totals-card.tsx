import { formatCents } from "@/features/quotes/lib/format";
import { formatAmountInWords } from "@/features/quotes/lib/amount-in-words";

export interface QuoteTotalsCardProps {
  subtotalCents: number | null;
  discountCents?: number;
  taxCents: number | null;
  totalCents: number | null;
  printSubtotalCents?: number | null;
  printTaxCents?: number | null;
  printTotalCents?: number | null;
  partialNotice?: string | null;
}

export function QuoteTotalsCard({
  subtotalCents,
  taxCents,
  totalCents,
  discountCents = 0,
  printSubtotalCents,
  printTaxCents,
  printTotalCents,
  partialNotice,
}: QuoteTotalsCardProps) {
  const hasPrintOverride = printTotalCents !== undefined && printTotalCents !== totalCents;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4 md:p-5 print:border-gray-200 print:bg-gray-50/50 print:p-4 mt-4 sm:mt-6 print:mt-4 print:break-inside-avoid print:overflow-visible">
      <div className="flex flex-col md:flex-row print:flex-row md:items-end print:items-end md:justify-between gap-6 print:gap-4">
        <div className="flex-1 order-2 md:order-1 print:order-1 text-xs text-[var(--color-text-muted)] print:text-gray-700 uppercase tracking-wide">
          <p data-testid="quote-total-in-words" className="print:text-xs print:text-gray-700 print:tracking-normal">
            {hasPrintOverride ? (
              <>
                <span className="print:hidden">{totalCents === null ? "Pendiente" : formatAmountInWords(totalCents)}</span>
                <span className="hidden print:inline">{printTotalCents === null ? "Pendiente" : formatAmountInWords(printTotalCents)}</span>
              </>
            ) : (
              totalCents === null ? "Pendiente" : formatAmountInWords(totalCents)
            )}
          </p>
          {partialNotice ? (
            <p className="mt-2 text-[11px] font-normal normal-case tracking-normal text-[var(--color-text-muted)] print:text-gray-600 italic">
              * {partialNotice}
            </p>
          ) : null}
        </div>
        <div className="flex-1 order-1 md:order-2 print:order-2 grid gap-2 min-w-[240px] md:max-w-[320px] print:max-w-[280px] ml-auto w-full">
          <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] print:text-gray-700">
            <span>Subtotal</span>
            <span data-testid="quote-subtotal" className="tabular-nums">
              {hasPrintOverride ? (
                <>
                  <span className="print:hidden">{formatCents(subtotalCents)}</span>
                  <span className="hidden print:inline">{formatCents(printSubtotalCents)}</span>
                </>
              ) : (
                formatCents(subtotalCents)
              )}
            </span>
          </div>
          {discountCents > 0 && (
            <div className="flex items-center justify-between text-sm text-[var(--color-status-success-fg)] print:text-gray-700">
              <span>Descuento</span>
              <span data-testid="quote-discount" className="tabular-nums">-{formatCents(discountCents)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] print:text-gray-700 border-b border-[var(--color-border-light)] print:border-gray-200 pb-3 mb-1">
            <span>IVA (16%)</span>
            <span data-testid="quote-tax" className="tabular-nums">
              {hasPrintOverride ? (
                <>
                  <span className="print:hidden">{formatCents(taxCents)}</span>
                  <span className="hidden print:inline">{formatCents(printTaxCents)}</span>
                </>
              ) : (
                formatCents(taxCents)
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-2xl md:text-xl font-bold text-[var(--color-total-emphasis)] print:text-blue-800">
            <span>Total</span>
            <span data-testid="quote-total" className="tabular-nums">
              {hasPrintOverride ? (
                <>
                  <span className="print:hidden">{formatCents(totalCents)}</span>
                  <span className="hidden print:inline">{formatCents(printTotalCents)}</span>
                </>
              ) : (
                formatCents(totalCents)
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
