import { formatCents } from "@/features/quotes/lib/format";
import { formatAmountInWords } from "@/features/quotes/lib/amount-in-words";

export interface QuoteTotalsCardProps {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function QuoteTotalsCard({ subtotalCents, taxCents, totalCents }: QuoteTotalsCardProps) {
  return (
    <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
      <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
        <span>Subtotal</span>
        <span data-testid="quote-subtotal">{formatCents(subtotalCents)}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
        <span>IVA</span>
        <span data-testid="quote-tax">{formatCents(taxCents)}</span>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border-light)] pt-2 text-xl font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
        <span>Total</span>
        <span data-testid="quote-total">{formatCents(totalCents)}</span>
      </div>
      <p
        className="text-xs leading-5 text-[var(--color-text-muted)]"
        data-testid="quote-total-in-words"
      >
        {formatAmountInWords(totalCents)}
      </p>
    </div>
  );
}
