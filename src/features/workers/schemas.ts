import { z } from "zod";

export const internalEmailDomain = "sebasam.local";

export function usernameToInternalEmail(username: string) {
  return `${username}@${internalEmailDomain}`;
}

export const workerKindSchema = z.enum(["MASTER", "HELPER"]);

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
}).transform((data) => ({
  ...data,
  email: usernameToInternalEmail(data.username),
}));

export const workerStatusSchema = z.enum(["ALL", "ACTIVE", "INACTIVE"]);

export const workerSearchSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
  status: workerStatusSchema.optional().default("ALL"),
});

export type WorkerInput = z.infer<typeof workerInputSchema>;
export type WorkerSearchInput = z.infer<typeof workerSearchSchema>;
