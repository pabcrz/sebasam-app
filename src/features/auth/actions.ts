"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginPath = "/admin/login";
const internalEmailDomain = "sebasam.local";

function normalizeUsername(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function usernameToInternalEmail(username: string) {
  return `${username}@${internalEmailDomain}`;
}

export async function loginAdmin(formData: FormData) {
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect(`${loginPath}?error=missing`);
  }

  const email = usernameToInternalEmail(username);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`${loginPath}?error=invalid`);
  }

  redirect("/admin");
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  redirect(loginPath);
}
