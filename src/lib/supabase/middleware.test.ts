import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "./middleware";

const getClaims = vi.fn();
let cookieHandlers: {
  setAll: (cookies: Array<{ name: string; value: string; options?: { path?: string } }>) => void;
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    cookieHandlers = options.cookies;
    return { auth: { getClaims } };
  }),
}));

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });
  });

  it("verifies claims instead of fetching the remote user", async () => {
    const response = await updateSession(new NextRequest("https://example.com/admin/quotes"));

    expect(createServerClient).toHaveBeenCalledTimes(1);
    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a protected route without verified identity", async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: new Error("invalid token") });

    const response = await updateSession(
      new NextRequest("https://example.com/admin/quotes?status=draft"),
    );

    expect(response.headers.get("location")).toBe("https://example.com/admin/login");
  });

  it("returns refreshed cookies for an authenticated request", async () => {
    getClaims.mockImplementation(async () => {
      cookieHandlers.setAll([{ name: "sb-session", value: "refreshed", options: { path: "/" } }]);
      return { data: { claims: { sub: "user-1" } }, error: null };
    });

    const response = await updateSession(new NextRequest("https://example.com/admin/quotes"));

    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.headers.get("location")).toBeNull();
  });

  it("preserves refreshed cookies on an unauthenticated redirect", async () => {
    getClaims.mockImplementation(async () => {
      cookieHandlers.setAll([{ name: "sb-session", value: "refreshed", options: { path: "/" } }]);
      return { data: { claims: null }, error: new Error("invalid token") };
    });

    const response = await updateSession(new NextRequest("https://example.com/admin"));

    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.headers.get("location")).toBe("https://example.com/admin/login");
  });

  it("does not redirect the login route", async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });

    const response = await updateSession(new NextRequest("https://example.com/admin/login"));

    expect(response.headers.get("location")).toBeNull();
  });
});
