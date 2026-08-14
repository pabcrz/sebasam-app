import { formatCents } from "@/features/quotes/lib/format";
import { formatAmountInWords } from "@/features/quotes/lib/amount-in-words";

export interface QuoteTotalsCardProps {
  subtotalCents: number;
  discountCents?: number;
  taxCents: number;
  totalCents: number;
}

export function QuoteTotalsCard({ subtotalCents, taxCents, totalCents, discountCents = 0 }: QuoteTotalsCardProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4 md:p-5 print:border-gray-200 print:bg-gray-50 print:p-4 mt-6 print:mt-4 print:break-inside-avoid">
      <div className="flex flex-col md:flex-row print:flex-row md:items-end print:items-end md:justify-between gap-6">
        <div className="flex-1 order-2 md:order-1 print:order-1 text-xs text-[var(--color-text-muted)] print:text-gray-500 uppercase tracking-wide">
          <p data-testid="quote-total-in-words">{formatAmountInWords(totalCents)}</p>
        </div>
        <div className="flex-1 order-1 md:order-2 print:order-2 grid gap-2 min-w-[240px] md:max-w-[320px] print:max-w-[320px] ml-auto w-full">
          <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] print:text-gray-600">
            <span>Subtotal</span>
            <span data-testid="quote-subtotal" className="tabular-nums">{formatCents(subtotalCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex items-center justify-between text-sm text-[var(--color-status-success-fg)] print:text-gray-600">
              <span>Descuento</span>
              <span data-testid="quote-discount" className="tabular-nums">-{formatCents(discountCents)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] print:text-gray-600 border-b border-[var(--color-border-light)] print:border-gray-300 pb-3 mb-1">
            <span>IVA</span>
            <span data-testid="quote-tax" className="tabular-nums">{formatCents(taxCents)}</span>
          </div>
          <div className="flex items-center justify-between text-2xl md:text-xl font-bold text-[var(--color-total-emphasis)] print:text-blue-800">
            <span>Total</span>
            <span data-testid="quote-total" className="tabular-nums">{formatCents(totalCents)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
