import type { User } from "@supabase/supabase-js";

export function getRootRedirectPath(user: User | null): string {
  return user ? "/admin" : "/admin/login";
}
