import { Badge } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";

export interface QuotePaymentBalanceIndicatorProps {
  paidCents?: number | null;
  remainingCents?: number | null;
  showOutstanding?: boolean;
}

export function QuotePaymentBalanceIndicator({ paidCents, remainingCents, showOutstanding = false }: QuotePaymentBalanceIndicatorProps) {
  // A quote with no payment has no financial state to display yet.
  if (paidCents == null || remainingCents == null || (paidCents <= 0 && !showOutstanding)) {
    return null;
  }

  const settled = remainingCents === 0;

  return (
    <Badge
      data-testid="quote-payment-balance-indicator"
      variant={settled ? "success" : "warning"}
      aria-label={settled ? "Cotización liquidada" : `Saldo pendiente ${formatCents(remainingCents)}`}
    >
      {settled ? "Liquidada" : `Saldo pendiente: ${formatCents(remainingCents)}`}
    </Badge>
  );
}
