import { fontScaleScript, themeScript } from "./inline-scripts";

type CspOptions = {
  nonce: string;
  /** sha256 digests (base64) of the app's own inline scripts. */
  scriptHashes: string[];
  isDevelopment: boolean;
  /** Vercel preview deployments inject a toolbar from vercel.live; production never gets it. */
  isPreview: boolean;
};

/**
 * Scripts run only with this request's nonce (or one of our two known inline scripts by hash);
 * 'strict-dynamic' lets those load their own chunks. Styles keep 'unsafe-inline' because
 * Next.js and next/font inject inline <style>; scripts never get it.
 */
export function buildContentSecurityPolicy({ nonce, scriptHashes, isDevelopment, isPreview }: CspOptions) {
  const live = isPreview ? " https://vercel.live" : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${scriptHashes.map((hash) => `'sha256-${hash}'`).join(" ")} 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}${live}`,
    `style-src 'self' 'unsafe-inline'${live}`,
    `img-src 'self' data: blob:${live}`,
    `font-src 'self' data:${live}`,
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}${live}${isPreview ? " wss://ws-us3.pusher.com" : ""}`,
    // "'none'" must be the only source in the directive, so previews replace it instead of extending it.
    isPreview ? "frame-src https://vercel.live" : "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    // Without this the service worker falls back to script-src, where 'strict-dynamic' ignores 'self'.
    "worker-src 'self'",
  ];
  if (!isDevelopment) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

async function sha256Base64(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

let inlineScriptHashes: Promise<string[]> | undefined;

export function getInlineScriptHashes() {
  inlineScriptHashes ??= Promise.all([themeScript, fontScaleScript].map(sha256Base64));
  return inlineScriptHashes;
}

export async function contentSecurityPolicyFor(nonce: string) {
  return buildContentSecurityPolicy({
    nonce,
    scriptHashes: await getInlineScriptHashes(),
    isDevelopment: process.env.NODE_ENV === "development",
    isPreview: process.env.VERCEL_ENV === "preview",
  });
}

/** Headers that do not depend on the request; served by next.config.ts. */
export function staticSecurityHeaders(isProduction: boolean) {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ];
  // No includeSubDomains: sibling subdomains of the production domain are not audited yet.
  if (isProduction) headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
  return headers;
}
