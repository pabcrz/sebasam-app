import { NextRequest } from "next/server";
import { contentSecurityPolicyFor } from "@/lib/security-headers";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = await contentSecurityPolicyFor(nonce);

  // Next reads the nonce from the request's CSP header and stamps its own scripts with it.
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", csp);
  headers.set("x-nonce", nonce);

  const response = await updateSession(new NextRequest(request, { headers }));
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
