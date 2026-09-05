import { z } from "zod";
import { quoteDraftFormInputSchema, quoteDraftInputSchema } from "@/features/quotes/schemas";

export const workOrderInputSchema = z.object({
  quoteId: z.string().min(1),
  scheduledFor: z.coerce.date().optional(),
  siteAddress: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

/**
 * Assigns a master (and optional helpers) to a work order in one step.
 * Also supports special orders where no registered worker is assigned.
 */
export const assignWorkOrderInputSchema = z
  .discriminatedUnion("isSpecial", [
    z.object({
      workOrderId: z.string().min(1),
      isSpecial: z.literal(false),
      masterId: z.string().uuid(),
      helperIds: z.array(z.string().uuid()).default([]),
    }),
    z.object({
      workOrderId: z.string().min(1),
      isSpecial: z.literal(true),
    }),
  ]);

export const completeWorkOrderInputSchema = z.object({
  workOrderId: z.string().min(1),
});

export const rollbackWorkOrderInputSchema = z.object({
  workOrderId: z.string().min(1),
  targetQuoteStatus: z.enum(["SENT", "DRAFT"]),
  reason: z.string().trim().min(1, "Indica el motivo de la corrección."),
});

export const startWorkOrderInputSchema = z.object({
  workOrderId: z.string().min(1),
});

export const executionRecordInputSchema = z.object({
  workOrderId: z.string().min(1),
  workerId: z.string().uuid(),
  summary: z.string().trim().default(""),
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
export type CompleteWorkOrderInput = z.infer<typeof completeWorkOrderInputSchema>;
export type RollbackWorkOrderInput = z.infer<typeof rollbackWorkOrderInputSchema>;
export type StartWorkOrderInput = z.infer<typeof startWorkOrderInputSchema>;
export type ExecutionRecordInput = z.infer<typeof executionRecordInputSchema>;
export type WorkAssignmentInput = z.infer<typeof workAssignmentInputSchema>;

export const directWorkOrderInputSchema = quoteDraftInputSchema.extend({
  masterId: z.string("El maestro responsable es obligatorio.").uuid("El maestro responsable es obligatorio."),
  isCompleted: z.boolean().default(false),
});

export const directWorkOrderFormInputSchema = quoteDraftFormInputSchema.extend({
  masterId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val : undefined),
    z.string("El maestro responsable es obligatorio.").uuid("El maestro responsable es obligatorio."),
  ),
  isCompleted: z.preprocess((val) => val === "on" || val === "true" || val === true, z.boolean().default(false)),
});

export type DirectWorkOrderInput = z.infer<typeof directWorkOrderInputSchema>;
export type DirectWorkOrderFormInput = z.infer<typeof directWorkOrderFormInputSchema>;
