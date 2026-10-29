import { z } from "zod";
import { UserRole, WorkerKind } from "@/generated/prisma/client";

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  displayName: z.string().min(3).max(100),
  role: z.nativeEnum(UserRole),
  workerKind: z.nativeEnum(WorkerKind).optional().nullable(),
  password: z.string().min(8).max(100),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(UserRole),
  workerKind: z.nativeEnum(WorkerKind).optional().nullable(),
});

export const toggleUserStatusSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
});

export const resetUserPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8).max(100),
});
