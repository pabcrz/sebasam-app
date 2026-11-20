import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fontScaleScript, themeScript } from "./inline-scripts";
import { buildContentSecurityPolicy, getInlineScriptHashes, staticSecurityHeaders } from "./security-headers";

const base = { nonce: "abc123", scriptHashes: ["HASH1", "HASH2"], isDevelopment: false, isPreview: false };

function directive(csp: string, name: string) {
  return csp.split("; ").find((part) => part.startsWith(`${name} `)) ?? "";
}

describe("buildContentSecurityPolicy", () => {
  it("allows scripts only by nonce or known hash, never unsafe-inline or unsafe-eval", () => {
    const script = directive(buildContentSecurityPolicy(base), "script-src");
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'sha256-HASH1' 'sha256-HASH2'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("unsafe-inline");
    expect(script).not.toContain("unsafe-eval");
  });

  it("blocks framing, plugins and foreign base/form targets, and keeps the service worker working", () => {
    const rules = buildContentSecurityPolicy(base).split("; ");
    for (const rule of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "worker-src 'self'", "upgrade-insecure-requests"]) {
      expect(rules).toContain(rule);
    }
  });

  it("opens eval, websockets and no HTTPS upgrade only in development", () => {
    const csp = buildContentSecurityPolicy({ ...base, isDevelopment: true });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("adds vercel.live only on preview deployments", () => {
    expect(buildContentSecurityPolicy(base)).not.toContain("vercel.live");
    expect(buildContentSecurityPolicy({ ...base, isPreview: true })).toContain("https://vercel.live");
  });
});

describe("getInlineScriptHashes", () => {
  it("matches the sha256 of the theme and font-scale scripts", async () => {
    const expected = [themeScript, fontScaleScript].map((text) => createHash("sha256").update(text).digest("base64"));
    expect(await getInlineScriptHashes()).toEqual(expected);
  });
});

describe("staticSecurityHeaders", () => {
  it("always sends nosniff, a strict referrer policy and a minimal permissions policy", () => {
    expect(staticSecurityHeaders(false).map((header) => header.key)).toEqual(["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]);
  });

  it("sends HSTS only in production, without includeSubDomains", () => {
    expect(staticSecurityHeaders(false).some((header) => header.key === "Strict-Transport-Security")).toBe(false);
    expect(staticSecurityHeaders(true).find((header) => header.key === "Strict-Transport-Security")?.value).toBe("max-age=31536000");
  });
});
