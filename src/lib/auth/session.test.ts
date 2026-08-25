import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const findUnique = vi.fn();
const redirect = vi.fn((path: string): never => {
  throw new Error(`redirect:${path}`);
});

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(callback: T): T => {
    let result: ReturnType<T> | undefined;
    return ((...args: Parameters<T>) => {
      result ??= callback(...args) as ReturnType<T>;
      return result;
    }) as T;
  },
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/prisma", () => ({ prisma: { userProfile: { findUnique } } }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser } })),
}));

function activeProfile(role = "ADMIN") {
  return { id: "user-1", role, isActive: true, displayName: "Admin" };
}

async function loadSession() {
  return import("./session");
}

describe("auth session resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    findUnique.mockResolvedValue(activeProfile());
  });

  it("reuses one user and profile resolution across page and role callers", async () => {
    const { requireOperationalRole, requireProfileForPage } = await loadSession();

    await requireProfileForPage();
    await requireOperationalRole();

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("allows SUPER_ADMIN wherever ADMIN or operational access is required", async () => {
    findUnique.mockResolvedValue(activeProfile("SUPER_ADMIN"));
    const { requireAdmin, requireOperationalRole, requireSuperAdmin } = await loadSession();

    await expect(requireAdmin()).resolves.toMatchObject({ profile: { role: "SUPER_ADMIN" } });
    await expect(requireOperationalRole()).resolves.toMatchObject({ profile: { role: "SUPER_ADMIN" } });
    await expect(requireSuperAdmin()).resolves.toMatchObject({ profile: { role: "SUPER_ADMIN" } });
  });

  it("exposes payment controls to exactly the roles authorized by requireAdmin", async () => {
    const { isAdminRole } = await loadSession();

    expect(isAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("ADMIN_ASSISTANT")).toBe(false);
  });

  it("keeps SUPER_ADMIN access exclusive", async () => {
    const { UnauthorizedRoleError, requireSuperAdmin } = await loadSession();

    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(UnauthorizedRoleError);
  });

  it("preserves the page redirect for a missing profile", async () => {
    findUnique.mockResolvedValue(null);
    const { requireProfileForPage } = await loadSession();

    await expect(requireProfileForPage()).rejects.toThrow("redirect:/admin/setup-required");
  });

  it("redirects flagged users from ordinary pages to password change", async () => {
    findUnique.mockResolvedValue({ ...activeProfile(), mustChangePassword: true });
    const { requireProfileForPage } = await loadSession();

    await expect(requireProfileForPage()).rejects.toThrow("redirect:/admin/change-password");
  });

  it("allows only flagged active users to reach the password-change page", async () => {
    findUnique.mockResolvedValue({ ...activeProfile(), mustChangePassword: true });
    const { requireProfileForPasswordChangePage } = await loadSession();

    await expect(requireProfileForPasswordChangePage()).resolves.toMatchObject({
      profile: { mustChangePassword: true },
    });
  });

  it("blocks flagged users from ordinary actions", async () => {
    findUnique.mockResolvedValue({ ...activeProfile(), mustChangePassword: true });
    const { PasswordChangeRequiredError, requireOperationalRole } = await loadSession();

    await expect(requireOperationalRole()).rejects.toBeInstanceOf(PasswordChangeRequiredError);
  });

  it("preserves the action error for a missing profile", async () => {
    findUnique.mockResolvedValue(null);
    const { MissingUserProfileError, requireProfile } = await loadSession();

    await expect(requireProfile()).rejects.toBeInstanceOf(MissingUserProfileError);
  });

  it("preserves the action error for an inactive profile", async () => {
    findUnique.mockResolvedValue({ ...activeProfile(), isActive: false });
    const { InactiveUserProfileError, requireSuperAdmin } = await loadSession();

    await expect(requireSuperAdmin()).rejects.toBeInstanceOf(InactiveUserProfileError);
  });

  it("preserves the login redirect for an unauthenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { requireProfileForPage } = await loadSession();

    await expect(requireProfileForPage()).rejects.toThrow("redirect:/admin/login");
    expect(findUnique).not.toHaveBeenCalled();
  });
});
