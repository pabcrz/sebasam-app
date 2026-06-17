import { QuoteItemType } from "@prisma/client";
import { z } from "zod";

export const quoteItemInputSchema = z.object({
  type: z.nativeEnum(QuoteItemType),
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPriceCents: z.coerce.number().int().nonnegative(),
});

export const quoteInputSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  administrative: z.boolean().default(false),
  items: z.array(quoteItemInputSchema).min(1),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
