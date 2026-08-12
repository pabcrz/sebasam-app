import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { measureServerTiming } from "@/lib/server-timing";

const protectedAdminPrefix = "/admin";
const loginPath = "/admin/login";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await measureServerTiming("auth", "proxy.claims", () =>
    supabase.auth.getClaims(),
  );
  const hasIdentity = !error && typeof data?.claims?.sub === "string";

  const isProtectedAdminRoute =
    request.nextUrl.pathname === protectedAdminPrefix ||
    (request.nextUrl.pathname.startsWith(`${protectedAdminPrefix}/`) &&
      request.nextUrl.pathname !== loginPath);

  if (isProtectedAdminRoute && !hasIdentity) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = loginPath;
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}
