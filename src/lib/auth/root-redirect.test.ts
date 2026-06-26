import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getRootRedirectPath } from "./root-redirect";

describe("getRootRedirectPath", () => {
  it("returns /admin for authenticated users", () => {
    const user = { id: "user-1" } as User;
    expect(getRootRedirectPath(user)).toBe("/admin");
  });

  it("returns /admin/login for unauthenticated users", () => {
    expect(getRootRedirectPath(null)).toBe("/admin/login");
  });
});
