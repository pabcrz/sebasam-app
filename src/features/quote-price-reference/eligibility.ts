import { QuoteStatus } from "@/generated/prisma/client";

/** A quote is a current price reference while it is live and not already completed work. */
export const PRICE_REFERENCE_STATUSES: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVED];
