import { z } from "zod";

export const workOrderInputSchema = z.object({
  quoteId: z.string().min(1),
  scheduledFor: z.coerce.date().optional(),
  siteAddress: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const executionRecordInputSchema = z.object({
  workOrderId: z.string().min(1),
  workerId: z.string().uuid().optional(),
  summary: z.string().trim().min(1),
  happenedAt: z.coerce.date().optional(),
});

export type WorkOrderInput = z.infer<typeof workOrderInputSchema>;
export type ExecutionRecordInput = z.infer<typeof executionRecordInputSchema>;
