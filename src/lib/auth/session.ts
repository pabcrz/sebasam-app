import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { measureServerTiming } from "@/lib/server-timing";
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

export class PasswordChangeRequiredError extends Error {
  constructor(userId: string) {
    super(`UserProfile ${userId} must change its password.`);
    this.name = "PasswordChangeRequiredError";
  }
}

export class UnauthorizedRoleError extends Error {
  constructor(role: UserRole, allowedRoles: UserRole[]) {
    super(`Role ${role} cannot perform this action. Allowed roles: ${allowedRoles.join(", ")}.`);
    this.name = "UnauthorizedRoleError";
  }
}

const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role !== null && role !== undefined && ADMIN_ROLES.includes(role);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await measureServerTiming("auth", "session.user", () => supabase.auth.getUser());

  if (error || !user) {
    return null;
  }

  return user;
});

const resolveCurrentProfile = cache(async () => {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const profile = await measureServerTiming("profile", "session.profile", () =>
    prisma.userProfile.findUnique({ where: { id: user.id } }),
  );

  return { user, profile };
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const { user, profile } = await resolveCurrentProfile();

  if (!user || !profile || !profile.isActive) {
    return null;
  }

  return { user, profile };
}

export async function requireProfile(): Promise<CurrentProfile> {
  const { user, profile } = await resolveCurrentProfile();

  if (!user) {
    redirect("/admin/login");
  }

  if (!profile) {
    throw new MissingUserProfileError(user.id);
  }

  if (!profile.isActive) {
    throw new InactiveUserProfileError(user.id);
  }

  if (profile.mustChangePassword) {
    throw new PasswordChangeRequiredError(user.id);
  }

  return { user, profile };
}

export async function requireProfileForPage(): Promise<CurrentProfile> {
  const { user, profile } = await resolveCurrentProfile();

  if (!user) {
    redirect("/admin/login");
  }

  if (!profile || !profile.isActive) {
    redirect("/admin/setup-required");
  }

  if (profile.mustChangePassword) {
    redirect("/admin/change-password");
  }

  return { user, profile };
}

export async function requireProfileForPasswordChange(): Promise<CurrentProfile> {
  const { user, profile } = await resolveCurrentProfile();

  if (!user) {
    redirect("/admin/login");
  }

  if (!profile) {
    throw new MissingUserProfileError(user.id);
  }

  if (!profile.isActive) {
    throw new InactiveUserProfileError(user.id);
  }

  if (!profile.mustChangePassword) {
    redirect("/admin");
  }

  return { user, profile };
}

export async function requireProfileForPasswordChangePage(): Promise<CurrentProfile> {
  const { user, profile } = await resolveCurrentProfile();

  if (!user) {
    redirect("/admin/login");
  }

  if (!profile || !profile.isActive) {
    redirect("/admin/setup-required");
  }

  if (!profile.mustChangePassword) {
    redirect("/admin");
  }

  return { user, profile };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentProfile> {
  const current = await requireProfile();

  if (current.profile.role !== "SUPER_ADMIN" && !allowedRoles.includes(current.profile.role)) {
    throw new UnauthorizedRoleError(current.profile.role, allowedRoles);
  }

  return current;
}

export async function requireAdmin(): Promise<CurrentProfile> {
  return requireRole(ADMIN_ROLES);
}

export async function requireSuperAdmin(): Promise<CurrentProfile> {
  return requireRole(["SUPER_ADMIN"]);
}

export async function requireOperationalRole(): Promise<CurrentProfile> {
  return requireRole(["SUPER_ADMIN", "ADMIN", "ADMIN_ASSISTANT"]);
}
