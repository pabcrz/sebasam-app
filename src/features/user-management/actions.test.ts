import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSuperAdmin = vi.hoisted(() => vi.fn());
const createUser = vi.hoisted(() => vi.fn());
const deleteUser = vi.hoisted(() => vi.fn());
const updateUserById = vi.hoisted(() => vi.fn());
const findUnique = vi.hoisted(() => vi.fn());
const profileCreate = vi.hoisted(() => vi.fn());
const profileFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const profileUpdate = vi.hoisted(() => vi.fn());
const profileCount = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireSuperAdmin }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: { createUser, deleteUser, updateUserById },
    },
  })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: findUnique,
      create: profileCreate,
      update: profileUpdate,
    },
    $transaction: vi.fn(async (callback) => {
      const tx = {
        userProfile: {
          findUniqueOrThrow: profileFindUniqueOrThrow,
          update: profileUpdate,
          count: profileCount,
        },
      };
      return callback(tx);
    }),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  createUser as createProfileUser,
  updateUserRole,
  toggleUserStatus,
  resetUserPassword,
} from "./actions";

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSuperAdmin.mockResolvedValue({ user: { id: "admin-1" }, profile: { role: "SUPER_ADMIN" } });
  });

  it("fails fast if username exists in Prisma", async () => {
    findUnique.mockResolvedValue({ id: "existing-user" });

    await expect(
      createProfileUser({
        username: "testuser",
        displayName: "Test User",
        role: "WORKER",
        password: "securepassword",
      })
    ).rejects.toThrow("Username already exists");

    expect(createUser).not.toHaveBeenCalled();
  });

  it("compensates by deleting Auth user if Prisma fails", async () => {
    findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({ data: { user: { id: "new-auth-id" } }, error: null });
    profileCreate.mockRejectedValue(new Error("Prisma error"));

    await expect(
      createProfileUser({
        username: "testuser",
        displayName: "Test User",
        role: "WORKER",
        password: "securepassword",
      })
    ).rejects.toThrow("Prisma error");

    expect(deleteUser).toHaveBeenCalledWith("new-auth-id");
  });

  it("creates user successfully", async () => {
    findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({ data: { user: { id: "new-auth-id" } }, error: null });
    profileCreate.mockResolvedValue({ id: "new-auth-id", username: "testuser" });

    const result = await createProfileUser({
      username: "testuser",
      displayName: "Test User",
      role: "WORKER",
      password: "securepassword",
    });

    expect(result.success).toBe(true);
    expect(profileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "new-auth-id",
        username: "testuser",
        role: "WORKER",
        mustChangePassword: true,
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});

describe("updateUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSuperAdmin.mockResolvedValue({ user: { id: "0304e4bf-f862-47c4-aa64-c040c4632c37" }, profile: { role: "SUPER_ADMIN" } });
  });

  it("prevents self-downgrade", async () => {
    profileFindUniqueOrThrow.mockResolvedValue({ id: "0304e4bf-f862-47c4-aa64-c040c4632c37", role: "SUPER_ADMIN" });

    await expect(
      updateUserRole({ userId: "0304e4bf-f862-47c4-aa64-c040c4632c37", role: "ADMIN" })
    ).rejects.toThrow("You cannot downgrade your own role");
  });

  it("prevents removing the last SUPER_ADMIN", async () => {
    profileFindUniqueOrThrow.mockResolvedValue({ id: "0304e4bf-f862-47c4-aa64-c040c4632c38", role: "SUPER_ADMIN" });
    profileCount.mockResolvedValue(1); // Only 1 active super admin left

    await expect(
      updateUserRole({ userId: "0304e4bf-f862-47c4-aa64-c040c4632c38", role: "ADMIN" })
    ).rejects.toThrow("Cannot remove the last active SUPER_ADMIN");
  });

  it("updates role successfully", async () => {
    profileFindUniqueOrThrow.mockResolvedValue({ id: "0304e4bf-f862-47c4-aa64-c040c4632c39", role: "WORKER" });

    await updateUserRole({ userId: "0304e4bf-f862-47c4-aa64-c040c4632c39", role: "ADMIN" });

    expect(profileUpdate).toHaveBeenCalledWith({
      where: { id: "0304e4bf-f862-47c4-aa64-c040c4632c39" },
      data: { role: "ADMIN", workerKind: null },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});

describe("toggleUserStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSuperAdmin.mockResolvedValue({ user: { id: "0304e4bf-f862-47c4-aa64-c040c4632c37" }, profile: { role: "SUPER_ADMIN" } });
  });

  it("prevents self-deactivation", async () => {
    profileFindUniqueOrThrow.mockResolvedValue({ id: "0304e4bf-f862-47c4-aa64-c040c4632c37", role: "SUPER_ADMIN", isActive: true });

    await expect(
      toggleUserStatus({ userId: "0304e4bf-f862-47c4-aa64-c040c4632c37", isActive: false })
    ).rejects.toThrow("You cannot deactivate your own account");
  });

  it("prevents deactivating the last SUPER_ADMIN", async () => {
    profileFindUniqueOrThrow.mockResolvedValue({ id: "0304e4bf-f862-47c4-aa64-c040c4632c38", role: "SUPER_ADMIN", isActive: true });
    profileCount.mockResolvedValue(1);

    await expect(
      toggleUserStatus({ userId: "0304e4bf-f862-47c4-aa64-c040c4632c38", isActive: false })
    ).rejects.toThrow("Cannot deactivate the last active SUPER_ADMIN");
  });

  it("toggles status successfully", async () => {
    profileFindUniqueOrThrow.mockResolvedValue({ id: "0304e4bf-f862-47c4-aa64-c040c4632c39", role: "WORKER", isActive: true });

    await toggleUserStatus({ userId: "0304e4bf-f862-47c4-aa64-c040c4632c39", isActive: false });

    expect(profileUpdate).toHaveBeenCalledWith({
      where: { id: "0304e4bf-f862-47c4-aa64-c040c4632c39" },
      data: { isActive: false },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});

describe("resetUserPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSuperAdmin.mockResolvedValue({ user: { id: "0304e4bf-f862-47c4-aa64-c040c4632c37" }, profile: { role: "SUPER_ADMIN" } });
  });

  it("resets password securely without logging it", async () => {
    updateUserById.mockResolvedValue({ error: null });

    const newPassword = "new-secure-password";
    await resetUserPassword({ userId: "0304e4bf-f862-47c4-aa64-c040c4632c3a", newPassword });

    expect(updateUserById).toHaveBeenCalledWith("0304e4bf-f862-47c4-aa64-c040c4632c3a", { password: newPassword });
    expect(profileUpdate).toHaveBeenCalledWith({
      where: { id: "0304e4bf-f862-47c4-aa64-c040c4632c3a" },
      data: { mustChangePassword: true },
    });

    // Check we don't accidentally leak it to normal logging paths (though in mock it's just the call)
    expect(JSON.stringify(profileUpdate.mock.calls)).not.toContain(newPassword);
  });
});
