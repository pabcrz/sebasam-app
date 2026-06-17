import { z } from "zod";

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;
