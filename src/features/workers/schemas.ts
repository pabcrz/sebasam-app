import { z } from "zod";

export const internalEmailDomain = "sebasam.local";

export function usernameToInternalEmail(username: string) {
  return `${username}@${internalEmailDomain}`;
}

export const workerKindSchema = z.enum(["MASTER", "HELPER"]);

const fixedPayCentsSchema = z.number().int().min(1).max(100_000_000).nullable().optional().default(null);

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must have at least 3 characters")
  .max(50, "Username must have at most 50 characters")
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, "Username contains invalid characters");

export const workerInputSchema = z.object({
  displayName: z.string().trim().min(1, "Worker name is required").max(160),
  username: usernameSchema,
  workerKind: workerKindSchema,
  fixedWeeklyPayCents: fixedPayCentsSchema,
  fixedDailyPayCents: fixedPayCentsSchema,
})
  .superRefine((data, ctx) => {
    if (
      data.workerKind === "HELPER" &&
      (data.fixedWeeklyPayCents === null) !== (data.fixedDailyPayCents === null)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed-pay helpers need both weekly and daily rates",
        path: ["fixedWeeklyPayCents"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    fixedWeeklyPayCents: data.workerKind === "HELPER" ? data.fixedWeeklyPayCents : null,
    fixedDailyPayCents: data.workerKind === "HELPER" ? data.fixedDailyPayCents : null,
    email: usernameToInternalEmail(data.username),
  }));

export const workerStatusSchema = z.enum(["ALL", "ACTIVE", "INACTIVE"]);

export const workerSearchSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
  status: workerStatusSchema.optional().default("ALL"),
});

export type WorkerInput = z.infer<typeof workerInputSchema>;
export type WorkerSearchInput = z.infer<typeof workerSearchSchema>;
