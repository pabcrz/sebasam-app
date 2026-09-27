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
  paymentDueDate: z.preprocess((val) => (val ? new Date(String(val)) : undefined), z.date().optional()),
});

export const directWorkOrderFormInputSchema = quoteDraftFormInputSchema.extend({
  masterId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val : undefined),
    z.string("El maestro responsable es obligatorio.").uuid("El maestro responsable es obligatorio."),
  ),
  isCompleted: z.preprocess((val) => val === "on" || val === "true" || val === true, z.boolean().default(false)),
  paymentDueDate: z.preprocess((val) => (typeof val === "string" && val.trim() !== "" ? new Date(val) : undefined), z.date().optional()),
});

export const directMaterialSaleInputSchema = quoteDraftInputSchema.extend({
  paymentDueDate: z.preprocess((val) => (val ? new Date(String(val)) : undefined), z.date().optional()),
}).superRefine((input, ctx) => {
  if (input.sections.some((section) => section.items.some((item) => item.type !== "MATERIAL" && item.type !== "REFACCIONES"))) {
    ctx.addIssue({ code: "custom", message: "Las ventas directas solo admiten conceptos de material o refacciones.", path: ["sections"] });
  }
});

export const directMaterialSaleFormInputSchema = quoteDraftFormInputSchema.extend({
  paymentDueDate: z.preprocess((val) => (typeof val === "string" && val.trim() !== "" ? new Date(val) : undefined), z.date().optional()),
}).superRefine((input, ctx) => {
  if (input.sections.some((section) => section.items.some((item) => item.type !== "MATERIAL" && item.type !== "REFACCIONES"))) {
    ctx.addIssue({ code: "custom", message: "Las ventas directas solo admiten conceptos de material o refacciones.", path: ["sections"] });
  }
});

export const directOperationInputSchema = z.discriminatedUnion("operation", [
  directWorkOrderInputSchema.extend({ operation: z.literal("WORK") }),
  directMaterialSaleInputSchema.extend({ operation: z.literal("SALE") }),
]);

export const directOperationFormInputSchema = z.discriminatedUnion("operation", [
  directWorkOrderFormInputSchema.extend({ operation: z.literal("WORK") }),
  directMaterialSaleFormInputSchema.extend({ operation: z.literal("SALE") }),
]);

export type DirectWorkOrderInput = z.infer<typeof directWorkOrderInputSchema>;
export type DirectWorkOrderFormInput = z.infer<typeof directWorkOrderFormInputSchema>;
export type DirectMaterialSaleInput = z.infer<typeof directMaterialSaleInputSchema>;
export type DirectMaterialSaleFormInput = z.infer<typeof directMaterialSaleFormInputSchema>;

export const convertQuoteToNoteInputSchema = z.object({
  quoteId: z.string().min(1),
  operation: z.enum(["WORK", "SALE"]).default("WORK"),
  masterId: z.string().uuid("El maestro responsable es obligatorio.").optional(),
  paymentDueDate: z.preprocess((val) => (val ? new Date(String(val)) : undefined), z.date().optional()),
  reason: z.string().trim().optional(),
});
export type ConvertQuoteToNoteInput = z.infer<typeof convertQuoteToNoteInputSchema>;

export const returnNoteToQuoteInputSchema = z.object({
  workOrderId: z.string().min(1),
  reason: z.string().trim().min(1, "Indica el motivo de la corrección."),
});
export type ReturnNoteToQuoteInput = z.infer<typeof returnNoteToQuoteInputSchema>;
