import { z } from "zod";

export const workOrderInputSchema = z.object({
  quoteId: z.string().min(1),
  scheduledFor: z.coerce.date().optional(),
  siteAddress: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const assignWorkOrderInputSchema = z.object({
  workOrderId: z.string().min(1),
  masterId: z.string().uuid(),
  helperIds: z.array(z.string().uuid()).default([]),
  workshopCapacityConfirmed: z.boolean(),
  masterAvailabilityConfirmed: z.boolean(),
});

export const startWorkOrderInputSchema = z.object({
  workOrderId: z.string().min(1),
  workshopCapacityConfirmed: z.boolean(),
  masterAvailabilityConfirmed: z.boolean(),
});

export const executionRecordInputSchema = z.object({
  workOrderId: z.string().min(1),
  workerId: z.string().uuid(),
  summary: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
  isExtra: z.boolean().default(false),
  happenedAt: z.coerce.date().optional(),
});

export const workAssignmentInputSchema = z.object({
  workOrderId: z.string().min(1),
  workerId: z.string().uuid(),
  notes: z.string().trim().optional(),
});

export type WorkOrderInput = z.infer<typeof workOrderInputSchema>;
export type AssignWorkOrderInput = z.infer<typeof assignWorkOrderInputSchema>;
export type StartWorkOrderInput = z.infer<typeof startWorkOrderInputSchema>;
export type ExecutionRecordInput = z.infer<typeof executionRecordInputSchema>;
export type WorkAssignmentInput = z.infer<typeof workAssignmentInputSchema>;
