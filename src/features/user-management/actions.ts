"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createUserSchema,
  updateUserRoleSchema,
  toggleUserStatusSchema,
  resetUserPasswordSchema,
} from "./schemas";

const usersPath = "/admin/users";
const internalEmailDomain = "sebasam.local";

function usernameToInternalEmail(username: string) {
  return `${username.toLowerCase()}@${internalEmailDomain}`;
}

export async function createUser(input: unknown) {
  await requireSuperAdmin();
  const data = createUserSchema.parse(input);

  const supabaseAdmin = createSupabaseAdminClient();
  const email = usernameToInternalEmail(data.username);

  // Check if username is already taken in Prisma to fail fast before Auth
  const existing = await prisma.userProfile.findUnique({
    where: { username: data.username },
  });
  if (existing) {
    throw new Error("Username already exists");
  }

  // Create Auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: data.password,
    user_metadata: { username: data.username },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Failed to create user in Auth");
  }

  const authUserId = authData.user.id;

  try {
    const userProfile = await prisma.userProfile.create({
      data: {
        id: authUserId,
        username: data.username,
        email,
        displayName: data.displayName,
        role: data.role,
        workerKind: data.workerKind || null,
        isActive: true,
        mustChangePassword: true,
      },
    });

    revalidatePath(usersPath);
    return { success: true, user: userProfile };
  } catch (error) {
    // Compensate: delete Auth user
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw error;
  }
}

export async function updateUserRole(input: unknown) {
  const current = await requireSuperAdmin();
  const data = updateUserRoleSchema.parse(input);

  await prisma.$transaction(
    async (tx) => {
      const targetUser = await tx.userProfile.findUniqueOrThrow({
        where: { id: data.userId },
      });

      if (targetUser.id === current.user.id && targetUser.role === "SUPER_ADMIN" && data.role !== "SUPER_ADMIN") {
        throw new Error("You cannot downgrade your own role");
      }

      if (targetUser.role === "SUPER_ADMIN" && data.role !== "SUPER_ADMIN") {
        const activeSuperAdmins = await tx.userProfile.count({
          where: { role: "SUPER_ADMIN", isActive: true },
        });

        if (activeSuperAdmins <= 1) {
          throw new Error("Cannot remove the last active SUPER_ADMIN");
        }
      }

      await tx.userProfile.update({
        where: { id: data.userId },
        data: {
          role: data.role,
          workerKind: data.role === "WORKER" ? data.workerKind : null,
        },
      });
    },
    { isolationLevel: "Serializable" }
  );

  revalidatePath(usersPath);
  return { success: true };
}

export async function toggleUserStatus(input: unknown) {
  const current = await requireSuperAdmin();
  const data = toggleUserStatusSchema.parse(input);

  await prisma.$transaction(
    async (tx) => {
      const targetUser = await tx.userProfile.findUniqueOrThrow({
        where: { id: data.userId },
      });

      if (targetUser.id === current.user.id && targetUser.isActive && !data.isActive) {
        throw new Error("You cannot deactivate your own account");
      }

      if (targetUser.role === "SUPER_ADMIN" && targetUser.isActive && !data.isActive) {
        const activeSuperAdmins = await tx.userProfile.count({
          where: { role: "SUPER_ADMIN", isActive: true },
        });

        if (activeSuperAdmins <= 1) {
          throw new Error("Cannot deactivate the last active SUPER_ADMIN");
        }
      }

      await tx.userProfile.update({
        where: { id: data.userId },
        data: { isActive: data.isActive },
      });
    },
    { isolationLevel: "Serializable" }
  );

  revalidatePath(usersPath);
  return { success: true };
}

export async function resetUserPassword(input: unknown) {
  await requireSuperAdmin();
  const data = resetUserPasswordSchema.parse(input);

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
    password: data.newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  await prisma.userProfile.update({
    where: { id: data.userId },
    data: { mustChangePassword: true },
  });

  return { success: true };
}
