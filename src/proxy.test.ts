import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const updateSession = vi.fn(async (request: NextRequest) => NextResponse.next({ request }));
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: (request: NextRequest) => updateSession(request) }));

import { proxy } from "./proxy";

describe("proxy", () => {
  it("sets a per-request CSP nonce on the request and the response", async () => {
    const first = await proxy(new NextRequest("https://example.com/admin"));
    const second = await proxy(new NextRequest("https://example.com/admin"));
    const csp = first.headers.get("Content-Security-Policy") ?? "";

    expect(csp).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(second.headers.get("Content-Security-Policy")).not.toBe(csp);

    const forwarded = updateSession.mock.calls[0][0];
    expect(forwarded.headers.get("Content-Security-Policy")).toBe(csp);
    expect(csp).toContain(`'nonce-${forwarded.headers.get("x-nonce")}'`);
  });
});
