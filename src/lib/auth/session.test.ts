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

  it("preserves the page redirect for a missing profile", async () => {
    findUnique.mockResolvedValue(null);
    const { requireProfileForPage } = await loadSession();

    await expect(requireProfileForPage()).rejects.toThrow("redirect:/admin/setup-required");
  });

  it("preserves the action error for a missing profile", async () => {
    findUnique.mockResolvedValue(null);
    const { MissingUserProfileError, requireProfile } = await loadSession();

    await expect(requireProfile()).rejects.toBeInstanceOf(MissingUserProfileError);
  });

  it("preserves the login redirect for an unauthenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { requireProfileForPage } = await loadSession();

    await expect(requireProfileForPage()).rejects.toThrow("redirect:/admin/login");
    expect(findUnique).not.toHaveBeenCalled();
  });
});
