import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  user: User;
  profile: UserProfile;
};

export class MissingUserProfileError extends Error {
  constructor(userId: string) {
    super(
      `No UserProfile exists for authenticated user ${userId}. Create a matching profile before accessing operational data.`,
    );
    this.name = "MissingUserProfileError";
  }
}

export class InactiveUserProfileError extends Error {
  constructor(userId: string) {
    super(`UserProfile ${userId} is inactive.`);
    this.name = "InactiveUserProfileError";
  }
}

export class UnauthorizedRoleError extends Error {
  constructor(role: UserRole, allowedRoles: UserRole[]) {
    super(`Role ${role} cannot perform this action. Allowed roles: ${allowedRoles.join(", ")}.`);
    this.name = "UnauthorizedRoleError";
  }
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile || !profile.isActive) {
    return null;
  }

  return { user, profile };
}

export const requireProfile = cache(async (): Promise<CurrentProfile> => {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    throw new MissingUserProfileError(user.id);
  }

  if (!profile.isActive) {
    throw new InactiveUserProfileError(user.id);
  }

  return { user, profile };
});

export async function requireProfileForPage(): Promise<CurrentProfile> {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile || !profile.isActive) {
    redirect("/admin/setup-required");
  }

  return { user, profile };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentProfile> {
  const current = await requireProfile();

  if (!allowedRoles.includes(current.profile.role)) {
    throw new UnauthorizedRoleError(current.profile.role, allowedRoles);
  }

  return current;
}

export async function requireAdmin(): Promise<CurrentProfile> {
  return requireRole(["ADMIN"]);
}

export async function requireOperationalRole(): Promise<CurrentProfile> {
  return requireRole(["ADMIN", "ADMIN_ASSISTANT"]);
}

